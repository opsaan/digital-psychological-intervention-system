const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const { sanitizeInput, validate, schemas } = require('../middleware/validation');
const { optionalAuthMiddleware, requireCounsellor } = require('../middleware/auth');
const Joi = require('joi');

const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Apply sanitization and optional authentication to all routes
router.use(sanitizeInput);
router.use(optionalAuthMiddleware);

/**
 * POST /api/v1/bookings
 * Create a new booking
 */
router.post('/',
  validate(schemas.booking),
  asyncHandler(async (req, res) => {
    const { counsellorId, timeSlot, contactPreference, anonymity, notes } = req.body;
    const userId = req.user?.id;
    const anonymousId = req.cookies.anonymousId;
    
    // Ensure we have some form of identification
    if (!userId && !anonymousId) {
      return res.status(400).json({
        error: 'Session identification required',
        message: 'Please enable cookies or log in to create bookings'
      });
    }
    
    // Verify counsellor exists and is active
    const counsellor = await prisma.counsellor.findFirst({
      where: {
        id: counsellorId,
        isActive: true
      }
    });
    
    if (!counsellor) {
      return res.status(404).json({
        error: 'Counsellor not found or not available'
      });
    }
    
    // Check if time slot is in the future
    const appointmentTime = new Date(timeSlot);
    if (appointmentTime <= new Date()) {
      return res.status(400).json({
        error: 'Invalid time slot',
        message: 'Appointment time must be in the future'
      });
    }
    
    // Check for conflicting bookings (same counsellor, same time, confirmed status)
    const conflictingBooking = await prisma.booking.findFirst({
      where: {
        counsellorId,
        timeSlot: appointmentTime,
        status: {
          in: ['REQUESTED', 'CONFIRMED']
        }
      }
    });
    
    if (conflictingBooking) {
      return res.status(409).json({
        error: 'Time slot not available',
        message: 'This time slot is already booked with the counsellor'
      }
    });
    
    // Create booking
    const booking = await prisma.booking.create({
      data: {
        userId,
        anonymousId: userId ? null : anonymousId,
        counsellorId,
        timeSlot: appointmentTime,
        contactPreference,
        anonymity: anonymity || false,
        notes,
        status: 'REQUESTED'
      },
      include: {
        counsellor: {
          select: {
            id: true,
            name: true,
            department: true,
            email: true,
            phone: true
          }
        }
      }
    });
    
    // Log analytics event
    await prisma.analyticsEvent.create({
      data: {
        type: 'booking_created',
        payload: {
          bookingId: booking.id,
          counsellorId,
          contactPreference,
          anonymity,
          timeSlot: appointmentTime.toISOString()
        },
        userId,
        anonymousId: userId ? null : anonymousId
      }
    }).catch(console.error);
    
    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      booking: {
        id: booking.id,
        timeSlot: booking.timeSlot,
        contactPreference: booking.contactPreference,
        anonymity: booking.anonymity,
        status: booking.status,
        notes: booking.notes,
        createdAt: booking.createdAt,
        counsellor: booking.counsellor
      }
    });
  })
);

/**
 * GET /api/v1/bookings/my
 * Get user's bookings
 */
router.get('/my',
  asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    const anonymousId = req.cookies.anonymousId;
    
    if (!userId && !anonymousId) {
      return res.status(400).json({
        error: 'Session identification required'
      });
    }
    
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const status = req.query.status; // Optional filter
    const offset = (page - 1) * limit;
    
    const where = {
      OR: [
        { userId },
        { anonymousId }
      ]
    };
    
    if (status && ['REQUESTED', 'CONFIRMED', 'CANCELLED'].includes(status)) {
      where.status = status;
    }
    
    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: {
          counsellor: {
            select: {
              id: true,
              name: true,
              department: true,
              email: true,
              phone: true
            }
          }
        },
        orderBy: {
          timeSlot: 'desc'
        },
        skip: offset,
        take: limit
      }),
      prisma.booking.count({ where })
    ]);
    
    res.json({
      success: true,
      bookings: bookings.map(booking => ({
        id: booking.id,
        timeSlot: booking.timeSlot,
        contactPreference: booking.contactPreference,
        anonymity: booking.anonymity,
        status: booking.status,
        notes: booking.notes,
        createdAt: booking.createdAt,
        updatedAt: booking.updatedAt,
        counsellor: booking.counsellor
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  })
);

/**
 * GET /api/v1/bookings/:id
 * Get specific booking
 */
router.get('/:id',
  asyncHandler(async (req, res) => {
    const bookingId = req.params.id;
    const userId = req.user?.id;
    const anonymousId = req.cookies.anonymousId;
    
    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        OR: [
          { userId },
          { anonymousId }
        ]
      },
      include: {
        counsellor: {
          select: {
            id: true,
            name: true,
            department: true,
            officeHours: true,
            room: true,
            email: true,
            phone: true
          }
        }
      }
    });
    
    if (!booking) {
      return res.status(404).json({
        error: 'Booking not found or access denied'
      });
    }
    
    res.json({
      success: true,
      booking: {
        id: booking.id,
        timeSlot: booking.timeSlot,
        contactPreference: booking.contactPreference,
        anonymity: booking.anonymity,
        status: booking.status,
        notes: booking.notes,
        createdAt: booking.createdAt,
        updatedAt: booking.updatedAt,
        counsellor: booking.counsellor
      }
    });
  })
);

/**
 * PATCH /api/v1/bookings/:id
 * Update booking (user can cancel, counsellor can confirm/cancel)
 */
const updateBookingSchema = Joi.object({
  status: Joi.string().valid('CONFIRMED', 'CANCELLED').required(),
  notes: Joi.string().max(500).allow('')
});

router.patch('/:id',
  validate(updateBookingSchema),
  asyncHandler(async (req, res) => {
    const bookingId = req.params.id;
    const { status, notes } = req.body;
    const userId = req.user?.id;
    const anonymousId = req.cookies.anonymousId;
    
    // Find booking
    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        OR: [
          { userId },
          { anonymousId }
        ]
      },
      include: {
        counsellor: true
      }
    });
    
    if (!booking) {
      return res.status(404).json({
        error: 'Booking not found or access denied'
      });
    }
    
    // Check if booking can be updated
    if (booking.status === 'CANCELLED') {
      return res.status(400).json({
        error: 'Cannot update cancelled booking'
      });
    }
    
    // Determine allowed actions based on user role
    const isCounsellor = req.user && ['COUNSELLOR', 'MODERATOR', 'ADMIN'].includes(req.user.role);
    const isBookingOwner = (userId && booking.userId === userId) || (anonymousId && booking.anonymousId === anonymousId);
    
    // Permissions check
    if (status === 'CONFIRMED') {
      // Only counsellors can confirm bookings
      if (!isCounsellor) {
        return res.status(403).json({
          error: 'Only counsellors can confirm bookings'
        });
      }
    } else if (status === 'CANCELLED') {
      // Both booking owner and counsellors can cancel
      if (!isBookingOwner && !isCounsellor) {
        return res.status(403).json({
          error: 'You can only cancel your own bookings'
        });
      }
    }
    
    // Update booking
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status,
        notes: notes !== undefined ? notes : booking.notes,
        updatedAt: new Date()
      },
      include: {
        counsellor: {
          select: {
            id: true,
            name: true,
            department: true,
            email: true,
            phone: true
          }
        }
      }
    });
    
    // Log analytics event
    await prisma.analyticsEvent.create({
      data: {
        type: 'booking_updated',
        payload: {
          bookingId,
          oldStatus: booking.status,
          newStatus: status,
          updatedBy: req.user ? 'user' : 'anonymous',
          userRole: req.user?.role
        },
        userId,
        anonymousId: userId ? null : anonymousId
      }
    }).catch(console.error);
    
    res.json({
      success: true,
      message: `Booking ${status.toLowerCase()} successfully`,
      booking: {
        id: updatedBooking.id,
        timeSlot: updatedBooking.timeSlot,
        contactPreference: updatedBooking.contactPreference,
        anonymity: updatedBooking.anonymity,
        status: updatedBooking.status,
        notes: updatedBooking.notes,
        createdAt: updatedBooking.createdAt,
        updatedAt: updatedBooking.updatedAt,
        counsellor: updatedBooking.counsellor
      }
    });
  })
);

/**
 * GET /api/v1/bookings/counsellor/my
 * Get bookings for counsellor (counsellors only)
 */
router.get('/counsellor/my',
  requireCounsellor,
  asyncHandler(async (req, res) => {
    // This endpoint requires a counsellor user to be associated with a counsellor record
    // For simplicity, we'll assume the user's email matches a counsellor's email
    const counsellor = await prisma.counsellor.findFirst({
      where: {
        email: req.user.email,
        isActive: true
      }
    });
    
    if (!counsellor) {
      return res.status(404).json({
        error: 'Counsellor profile not found. Please contact an administrator.'
      });
    }
    
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const status = req.query.status;
    const offset = (page - 1) * limit;
    
    const where = {
      counsellorId: counsellor.id
    };
    
    if (status && ['REQUESTED', 'CONFIRMED', 'CANCELLED'].includes(status)) {
      where.status = status;
    }
    
    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        select: {
          id: true,
          timeSlot: true,
          contactPreference: true,
          anonymity: true,
          status: true,
          notes: true,
          createdAt: true,
          updatedAt: true,
          // Only show user info if not anonymous
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: {
          timeSlot: 'asc'
        },
        skip: offset,
        take: limit
      }),
      prisma.booking.count({ where })
    ]);
    
    res.json({
      success: true,
      bookings: bookings.map(booking => ({
        ...booking,
        user: booking.anonymity ? null : booking.user // Hide user info for anonymous bookings
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  })
);

module.exports = router;

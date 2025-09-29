const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  try {
    // Create admin user
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!@#';
    const adminName = process.env.ADMIN_NAME || 'System Administrator';

    console.log('👑 Creating admin user...');
    const adminPasswordHash = await bcrypt.hash(adminPassword, 12);
    
    const adminUser = await prisma.user.upsert({
      where: { email: adminEmail },
      update: {},
      create: {
        email: adminEmail,
        passwordHash: adminPasswordHash,
        name: adminName,
        role: 'ADMIN',
        preferredLanguage: 'en'
      }
    });

    console.log(`✅ Admin user created: ${adminEmail}`);
    console.log(`🔐 Admin password: ${adminPassword}`);
    console.log('⚠️  Please change the admin password after first login!');

    // Create sample counsellors
    console.log('👨‍⚕️ Creating sample counsellors...');
    const counsellors = [
      {
        name: 'Dr. Sarah Johnson',
        department: 'Psychology',
        officeHours: 'Mon-Fri 9:00 AM - 5:00 PM',
        room: 'Psychology Building, Room 201',
        email: 'sarah.johnson@example.com',
        phone: '+1-555-0101',
        isActive: true
      },
      {
        name: 'Dr. Michael Chen',
        department: 'Counseling Services',
        officeHours: 'Tue-Thu 10:00 AM - 6:00 PM',
        room: 'Student Services Building, Room 150',
        email: 'michael.chen@example.com',
        phone: '+1-555-0102',
        isActive: true
      },
      {
        name: 'Dr. Emily Rodriguez',
        department: 'Clinical Psychology',
        officeHours: 'Mon, Wed, Fri 1:00 PM - 7:00 PM',
        room: 'Health Center, Room 302',
        email: 'emily.rodriguez@example.com',
        phone: '+1-555-0103',
        isActive: true
      },
      {
        name: 'Dr. James Wilson',
        department: 'Psychiatric Services',
        officeHours: 'Mon-Thu 8:00 AM - 4:00 PM',
        room: 'Medical Center, Room 450',
        email: 'james.wilson@example.com',
        phone: '+1-555-0104',
        isActive: true
      }
    ];

    for (const counsellor of counsellors) {
      await prisma.counsellor.upsert({
        where: { email: counsellor.email },
        update: counsellor,
        create: counsellor
      });
    }

    console.log(`✅ Created ${counsellors.length} counsellors`);

    // Create helplines
    console.log('📞 Creating crisis helplines...');
    const helplines = [
      {
        title: 'National Suicide Prevention Lifeline',
        phone: '988',
        campusOnly: false,
        isActive: true
      },
      {
        title: 'Crisis Text Line',
        phone: '741741',
        campusOnly: false,
        isActive: true
      },
      {
        title: 'Campus Crisis Hotline',
        phone: '+1-555-HELP',
        campusOnly: true,
        isActive: true
      },
      {
        title: 'Student Support Services',
        phone: '+1-555-SUPPORT',
        campusOnly: true,
        isActive: true
      },
      {
        title: 'Mental Health Emergency',
        phone: '+1-555-MENTAL',
        campusOnly: true,
        isActive: true
      }
    ];

    for (const helpline of helplines) {
      await prisma.helpline.upsert({
        where: { 
          title_phone: {
            title: helpline.title,
            phone: helpline.phone
          }
        },
        update: helpline,
        create: helpline
      });
    }

    console.log(`✅ Created ${helplines.length} helplines`);

    // Create sample resources
    console.log('📚 Creating sample resources...');
    const resources = [
      {
        title: 'Understanding Anxiety: A Comprehensive Guide',
        description: 'Learn about anxiety disorders, symptoms, and coping strategies in this detailed guide.',
        language: 'en',
        type: 'GUIDE',
        embedUrl: null,
        createdByUserId: adminUser.id,
        isActive: true
      },
      {
        title: 'Mindfulness Meditation for Beginners',
        description: 'A guided introduction to mindfulness meditation techniques for stress reduction.',
        language: 'en',
        type: 'AUDIO',
        embedUrl: 'https://example.com/meditation-audio',
        createdByUserId: adminUser.id,
        isActive: true
      },
      {
        title: 'Managing Depression: Daily Strategies',
        description: 'Practical daily strategies and techniques for managing depression symptoms.',
        language: 'en',
        type: 'VIDEO',
        embedUrl: 'https://example.com/depression-video',
        createdByUserId: adminUser.id,
        isActive: true
      },
      {
        title: 'Sleep Hygiene Guide',
        description: 'Complete guide to improving sleep quality and establishing healthy sleep habits.',
        language: 'en',
        type: 'GUIDE',
        embedUrl: null,
        createdByUserId: adminUser.id,
        isActive: true
      },
      {
        title: 'Stress Management Techniques',
        description: 'Evidence-based stress management and relaxation techniques.',
        language: 'en',
        type: 'VIDEO',
        embedUrl: 'https://example.com/stress-video',
        createdByUserId: adminUser.id,
        isActive: true
      },
      {
        title: 'चिंता को समझना: एक विस्तृत गाइड',
        description: 'चिंता विकारों, लक्षणों और सामना करने की रणनीतियों के बारे में जानें।',
        language: 'hi',
        type: 'GUIDE',
        embedUrl: null,
        createdByUserId: adminUser.id,
        isActive: true
      }
    ];

    for (const resource of resources) {
      await prisma.resource.create({
        data: resource
      });
    }

    console.log(`✅ Created ${resources.length} sample resources`);

    // Create sample demo user
    console.log('👤 Creating demo user...');
    const demoPasswordHash = await bcrypt.hash('Demo123!@#', 12);
    
    const demoUser = await prisma.user.upsert({
      where: { email: 'demo@example.com' },
      update: {},
      create: {
        email: 'demo@example.com',
        passwordHash: demoPasswordHash,
        name: 'Demo User',
        role: 'STUDENT',
        preferredLanguage: 'en'
      }
    });

    console.log('✅ Demo user created: demo@example.com (password: Demo123!@#)');

    // Create sample peer support posts
    console.log('💬 Creating sample peer support content...');
    const samplePosts = [
      {
        userId: demoUser.id,
        displayAlias: 'Anonymous Student',
        content: 'Starting my mental health journey and looking for support. Has anyone here tried mindfulness meditation? Would love to hear about your experiences.',
        tags: ['mindfulness', 'support', 'beginner'],
        status: 'PUBLISHED'
      },
      {
        userId: null,
        anonymousId: 'demo-anon-1',
        displayAlias: 'Hopeful Helper',
        content: 'Just wanted to share that it does get better. I\'ve been working with a counsellor for 6 months and the difference is amazing. Don\'t give up!',
        tags: ['hope', 'counselling', 'recovery'],
        status: 'PUBLISHED'
      },
      {
        userId: null,
        anonymousId: 'demo-anon-2',
        displayAlias: 'Study Buddy',
        content: 'Academic stress is really getting to me this semester. Anyone have good study techniques that help with anxiety?',
        tags: ['academic-stress', 'study-tips', 'anxiety'],
        status: 'PUBLISHED'
      }
    ];

    for (const post of samplePosts) {
      await prisma.peerPost.create({
        data: post
      });
    }

    console.log(`✅ Created ${samplePosts.length} sample peer posts`);

    // Create sample screenings
    console.log('📊 Creating sample screening data...');
    const sampleScreenings = [
      {
        userId: demoUser.id,
        type: 'PHQ9',
        answers: [1, 1, 2, 1, 0, 1, 1, 0, 0], // Mild depression
        score: 7,
        severityBand: 'mild',
        consent: true
      },
      {
        userId: demoUser.id,
        type: 'GAD7',
        answers: [2, 1, 2, 1, 1, 1, 0], // Moderate anxiety
        score: 8,
        severityBand: 'mild',
        consent: true
      }
    ];

    for (const screening of sampleScreenings) {
      await prisma.screening.create({
        data: screening
      });
    }

    console.log(`✅ Created ${sampleScreenings.length} sample screenings`);

    // Create system configuration
    console.log('⚙️ Creating system configuration...');
    const configs = [
      {
        key: 'site_name',
        value: 'Digital Psychological Intervention System'
      },
      {
        key: 'site_description',
        value: 'Comprehensive mental health support platform'
      },
      {
        key: 'features_enabled',
        value: {
          chat: true,
          screenings: true,
          booking: true,
          resources: true,
          peer_support: true,
          admin_panel: true
        }
      },
      {
        key: 'default_language',
        value: 'en'
      },
      {
        key: 'supported_languages',
        value: ['en', 'hi']
      },
      {
        key: 'crisis_mode_enabled',
        value: true
      },
      {
        key: 'maintenance_mode',
        value: false
      }
    ];

    for (const config of configs) {
      await prisma.config.upsert({
        where: { key: config.key },
        update: { value: config.value },
        create: config
      });
    }

    console.log(`✅ Created ${configs.length} configuration entries`);

    // Create some analytics events for demo
    console.log('📈 Creating sample analytics data...');
    const now = new Date();
    const analyticsEvents = [];

    // Create events for the past 30 days
    for (let i = 0; i < 30; i++) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      
      // Random number of events per day
      const eventsPerDay = Math.floor(Math.random() * 20) + 5;
      
      for (let j = 0; j < eventsPerDay; j++) {
        const eventTypes = [
          'chat_session_started',
          'chat_message_sent',
          'screening_completed',
          'booking_created',
          'resource_viewed',
          'peer_post_created'
        ];
        
        const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
        
        analyticsEvents.push({
          type: eventType,
          payload: {
            timestamp: date.toISOString(),
            synthetic: true
          },
          userId: Math.random() > 0.5 ? demoUser.id : null,
          anonymousId: Math.random() > 0.7 ? `demo-${crypto.randomBytes(8).toString('hex')}` : null,
          createdAt: date
        });
      }
    }

    await prisma.analyticsEvent.createMany({
      data: analyticsEvents
    });

    console.log(`✅ Created ${analyticsEvents.length} sample analytics events`);

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   👑 Admin user: ${adminEmail}`);
    console.log(`   👤 Demo user: demo@example.com`);
    console.log(`   👨‍⚕️ Counsellors: ${counsellors.length}`);
    console.log(`   📞 Helplines: ${helplines.length}`);
    console.log(`   📚 Resources: ${resources.length}`);
    console.log(`   💬 Peer posts: ${samplePosts.length}`);
    console.log(`   📊 Sample screenings: ${sampleScreenings.length}`);
    console.log(`   ⚙️ Config entries: ${configs.length}`);
    console.log(`   📈 Analytics events: ${analyticsEvents.length}`);
    console.log('\n🚀 Your system is ready to use!');
    console.log('\n⚠️  Important:');
    console.log('   - Change admin password after first login');
    console.log('   - Review and update helpline numbers for your region');
    console.log('   - Customize resources and counsellor information');
    console.log('   - Configure SMTP settings for email notifications');

  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

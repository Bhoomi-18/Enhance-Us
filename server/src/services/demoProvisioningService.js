import User from '../models/userModel.js';
import Goal from '../models/goalModel.js';
import Match from '../models/matchModel.js';
import ExchangeRequest from '../models/exchangeRequestModel.js';
import Connection from '../models/connectionModel.js';
import Conversation from '../models/conversationModel.js';
import Message from '../models/messageModel.js';
import Session from '../models/sessionModel.js';
import Review from '../models/reviewModel.js';
import Notification from '../models/notificationModel.js';

export const DEMO_EMAIL = process.env.DEMO_USER_EMAIL || 'demo@enhanceus.org';
export const DEMO_PASSWORD = process.env.DEMO_USER_PASSWORD || 'DemoPassword123!';

export const provisionDemoAccount = async () => {
  // Only skip MongoDB provisioning if MongoDB is truly disconnected
  if (process.env.MOCK_DB === 'true' && User.db?.readyState !== 1) {
    return { enabled: true, email: DEMO_EMAIL, password: DEMO_PASSWORD };
  }

  try {
    let demoUser = await User.findOne({ email: DEMO_EMAIL });

    if (!demoUser) {
      console.log('⚡ Provisioning dedicated EnhanceUs Demo Account...');

      demoUser = await User.create({
        name: 'Demo Account User',
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
        bio: 'Demonstration account showcasing EnhanceUs goal analysis and reciprocal skill exchanges.',
        avatar: '',
        isDemo: true,
        emailVerified: true,
        onboardingCompletedAt: new Date(),
        skills: [
          { name: 'React', level: 'ADVANCED', category: 'Frontend', type: 'TEACH' },
          { name: 'Node.js', level: 'INTERMEDIATE', category: 'Backend', type: 'TEACH' },
        ],
        learningInterests: [
          { name: 'UI/UX Design', category: 'Design', priority: 'HIGH' },
          { name: 'DevOps & Cloud', category: 'Infrastructure', priority: 'HIGH' },
        ],
        availability: 'flexible',
        timezone: 'UTC',
        experienceLevel: 'ADVANCED',
        preferredLearningStyle: 'hands_on',
        sessionsCompleted: 3,
        hoursTaught: 12,
        hoursLearned: 10,
        exchangesCompleted: 2,
        reputation: { averageRating: 4.9, reviewCount: 5 },
      });

      // Provision isolated demo partner user
      let demoPeer = await User.findOne({ email: 'sarah.demo@enhanceus.org' });
      if (!demoPeer) {
        demoPeer = await User.create({
          name: 'Sarah Chen (Demo Mentor)',
          email: 'sarah.demo@enhanceus.org',
          password: DEMO_PASSWORD,
          bio: 'UI/UX Specialist & Figma Prototyper passionate about teaching design systems.',
          avatar: '',
          isDemo: true,
          emailVerified: true,
          onboardingCompletedAt: new Date(),
          skills: [
            { name: 'UI/UX Design', level: 'EXPERT', category: 'Design', type: 'TEACH' },
            { name: 'Figma Prototyping', level: 'ADVANCED', category: 'Design', type: 'TEACH' },
          ],
          learningInterests: [
            { name: 'React', category: 'Frontend', priority: 'HIGH' },
          ],
          availability: 'flexible',
          timezone: 'UTC',
          experienceLevel: 'EXPERT',
          preferredLearningStyle: 'collaborative',
        });
      }

      // Create Demo Goal
      const demoGoal = await Goal.create({
        user: demoUser._id,
        title: 'Build an AI-Powered SaaS Blueprint',
        description: 'Create a production-grade SaaS with React frontend, Node.js backend, and polished UI/UX design.',
        status: 'ACTIVE',
        requiredSkills: [
          { name: 'React', category: 'Frontend', level: 'ADVANCED', importance: 'HIGH' },
          { name: 'Node.js', category: 'Backend', level: 'INTERMEDIATE', importance: 'HIGH' },
          { name: 'UI/UX Design', category: 'Design', level: 'INTERMEDIATE', importance: 'HIGH' },
          { name: 'DevOps & Cloud', category: 'Infrastructure', level: 'INTERMEDIATE', importance: 'MEDIUM' },
        ],
        userSkillsSnapshot: [
          { name: 'React', level: 'ADVANCED', category: 'Frontend' },
          { name: 'Node.js', level: 'INTERMEDIATE', category: 'Backend' },
        ],
        skillGaps: {
          knownSkills: [{ name: 'React' }, { name: 'Node.js' }],
          missingSkills: [
            { name: 'UI/UX Design', category: 'Design', recommendedLevel: 'INTERMEDIATE', importance: 'HIGH' },
            { name: 'DevOps & Cloud', category: 'Infrastructure', recommendedLevel: 'INTERMEDIATE', importance: 'MEDIUM' },
          ],
          partiallyKnownSkills: [],
          gapPercentage: 50,
        },
        progress: 50,
      });

      // Create Demo Match
      const demoMatch = await Match.create({
        user: demoUser._id,
        candidate: demoPeer._id,
        goal: demoGoal._id,
        matchedSkills: [{ needSkill: 'UI/UX Design', candidateTeachSkill: 'UI/UX Design' }],
        reciprocalSkills: [{ candidateLearnSkill: 'React', userTeachSkill: 'React' }],
        availabilityCompatibility: true,
        skillCompatibility: 95,
        overallScore: 96,
        explanation: [
          '✓ They teach UI/UX Design, which you need for your goal',
          '✓ You teach React, which they want to learn',
          '✓ Schedule alignment (flexible availability overlaps)',
        ],
        status: 'CONNECTED',
      });

      // Create Demo Exchange Request
      const demoReq = await ExchangeRequest.create({
        sender: demoUser._id,
        recipient: demoPeer._id,
        goal: demoGoal._id,
        match: demoMatch._id,
        offeredSkill: 'React',
        requestedSkill: 'UI/UX Design',
        proposedExchange: "Hi Sarah! I'd love to exchange React knowledge for UI/UX Design feedback on my SaaS blueprint.",
        status: 'ACCEPTED',
      });

      // Create Demo Connection & Conversation
      const demoConn = await Connection.create({
        participants: [demoUser._id, demoPeer._id],
        goal: demoGoal._id,
        exchangeRequest: demoReq._id,
        skills: { userASkill: 'React', userBSkill: 'UI/UX Design' },
        status: 'ACTIVE',
      });

      const demoConv = await Conversation.create({
        participants: [demoUser._id, demoPeer._id],
        connection: demoConn._id,
        lastMessage: {
          text: "Looking forward to our upcoming design review session!",
          sender: demoPeer._id,
          createdAt: new Date(),
        },
      });

      await Message.create({
        conversation: demoConv._id,
        sender: demoUser._id,
        recipient: demoPeer._id,
        text: "Hi Sarah! Excited to work together on UI/UX prototyping.",
      });

      await Message.create({
        conversation: demoConv._id,
        sender: demoPeer._id,
        recipient: demoUser._id,
        text: "Hi! Looking forward to our upcoming design review session!",
      });

      // Create Demo Sessions
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(15, 0, 0, 0);

      await Session.create({
        connection: demoConn._id,
        goal: demoGoal._id,
        participants: [demoUser._id, demoPeer._id],
        host: demoUser._id,
        date: tomorrow,
        time: '15:00',
        durationMinutes: 60,
        skillTaught: 'UI/UX Design',
        sessionNotes: 'Review SaaS Figma Wireframe & Component Hierarchy.',
        status: 'SCHEDULED',
      });

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(14, 0, 0, 0);

      await Session.create({
        connection: demoConn._id,
        goal: demoGoal._id,
        participants: [demoUser._id, demoPeer._id],
        host: demoPeer._id,
        date: yesterday,
        time: '14:00',
        durationMinutes: 60,
        skillTaught: 'React',
        sessionNotes: 'Component architecture and custom hooks overview.',
        status: 'COMPLETED',
        completedBy: [demoUser._id, demoPeer._id],
      });

      // Create Demo Notification
      await Notification.create({
        recipient: demoUser._id,
        sender: demoPeer._id,
        title: 'Demo Exchange Connected!',
        message: 'Sarah Chen accepted your skill exchange request for UI/UX Design.',
        type: 'EXCHANGE_ACCEPTED',
        link: `/conversations`,
        read: false,
      });

      console.log('✅ EnhanceUs Demo Account provisioned successfully.');
    } else if (!demoUser.emailVerified) {
      demoUser.emailVerified = true;
      await demoUser.save();
    }

    return { enabled: true, email: DEMO_EMAIL, password: DEMO_PASSWORD };
  } catch (error) {
    console.error('⚠️ Demo provisioning error:', error.message);
    return { enabled: true, email: DEMO_EMAIL, password: DEMO_PASSWORD };
  }
};

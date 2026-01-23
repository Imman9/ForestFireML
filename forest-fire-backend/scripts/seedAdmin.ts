import { sequelize, User } from '../src/models';
import bcrypt from 'bcryptjs';

async function seedAdmin() {
  try {
    await sequelize.authenticate();
    console.log('Database connected.');

    const email = 'admin@forestfire.com';
    const password = 'admin123';
    const hashedPassword = await bcrypt.hash(password, 10);

    const [user, created] = await User.findOrCreate({
      where: { email },
      defaults: {
        name: 'System Administrator',
        email,
        password: hashedPassword,
        role: 'admin'
      }
    });

    if (created) {
      console.log('Admin user created successfully.');
    } else {
      console.log('Admin user already exists.');
      // Update password just in case
      user.password = hashedPassword;
      user.role = 'admin';
      await user.save();
      console.log('Admin user updated.');
    }

  } catch (error) {
    console.error('Error seeding admin:', error);
  } finally {
    await sequelize.close();
  }
}

seedAdmin();

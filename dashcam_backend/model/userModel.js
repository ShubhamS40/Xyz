import prisma from '../config/database.js';

class UserModel {
  // Create new user (unverified)
  async createUser(email, passwordHash, companyName, companyType) {
    return await prisma.user.create({
      data: {
        email,
        passwordHash,
        companyName: companyName || null,
        companyType,
        isActive: false,
        emailVerified: false,
      },
    });
  }

  // Get user by email
  async getUserByEmail(email) {
    return await prisma.user.findUnique({
      where: { email },
      include: {
        loginOtp: true,
        registrationOtp: true,
      },
    });
  }

  // Get user by ID
  async getUserById(id) {
    return await prisma.user.findUnique({
      where: { id },
    });
  }

  // Update user
  async updateUser(id, data) {
    return await prisma.user.update({
      where: { id },
      data,
    });
  }

  // Create registration OTP
  async createRegistrationOtp(userId, otpCode, expiresAt) {
    // Delete any existing registration OTPs for this user
    await prisma.userRegistrationOtp.deleteMany({
      where: { userId, used: false },
    });

    return await prisma.userRegistrationOtp.create({
      data: {
        userId,
        otpCode,
        expiresAt,
      },
    });
  }

  // Verify registration OTP
  async verifyRegistrationOtp(userId, otpCode) {
    const otp = await prisma.userRegistrationOtp.findFirst({
      where: {
        userId,
        otpCode,
        used: false,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!otp) {
      return null;
    }

    // Mark OTP as used
    await prisma.userRegistrationOtp.update({
      where: { id: otp.id },
      data: { used: true },
    });

    return otp;
  }

  // Create login OTP
  async createLoginOtp(userId, otpCode, expiresAt) {
    // Delete any existing login OTPs for this user
    await prisma.userLoginOtp.deleteMany({
      where: { userId, used: false },
    });

    return await prisma.userLoginOtp.create({
      data: {
        userId,
        otpCode,
        expiresAt,
      },
    });
  }

  // Verify login OTP
  async verifyLoginOtp(userId, otpCode) {
    const otp = await prisma.userLoginOtp.findFirst({
      where: {
        userId,
        otpCode,
        used: false,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!otp) {
      return null;
    }

    // Mark OTP as used
    await prisma.userLoginOtp.update({
      where: { id: otp.id },
      data: { used: true },
    });

    return otp;
  }
}

export default new UserModel();

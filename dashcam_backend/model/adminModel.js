import prisma from '../config/database.js';

class AdminModel {
  // Create new admin (unverified)
  async createAdmin(email, passwordHash) {
    return await prisma.admin.create({
      data: {
        email,
        passwordHash,
        isActive: false,
        emailVerified: false,
      },
    });
  }

  // Get admin by email
  async getAdminByEmail(email) {
    return await prisma.admin.findUnique({
      where: { email },
      include: {
        loginOtp: true,
        registrationOtp: true,
      },
    });
  }

  // Get admin by ID
  async getAdminById(id) {
    return await prisma.admin.findUnique({
      where: { id },
    });
  }

  // Update admin
  async updateAdmin(id, data) {
    return await prisma.admin.update({
      where: { id },
      data,
    });
  }

  // Create registration OTP
  async createRegistrationOtp(adminId, otpCode, expiresAt) {
    // Delete any existing registration OTPs for this admin
    await prisma.adminRegistrationOtp.deleteMany({
      where: { adminId, used: false },
    });

    return await prisma.adminRegistrationOtp.create({
      data: {
        adminId,
        otpCode,
        expiresAt,
      },
    });
  }

  // Verify registration OTP
  async verifyRegistrationOtp(adminId, otpCode) {
    const otp = await prisma.adminRegistrationOtp.findFirst({
      where: {
        adminId,
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
    await prisma.adminRegistrationOtp.update({
      where: { id: otp.id },
      data: { used: true },
    });

    return otp;
  }

  // Create login OTP
  async createLoginOtp(adminId, otpCode, expiresAt) {
    // Delete any existing login OTPs for this admin
    await prisma.adminLoginOtp.deleteMany({
      where: { adminId, used: false },
    });

    return await prisma.adminLoginOtp.create({
      data: {
        adminId,
        otpCode,
        expiresAt,
      },
    });
  }

  // Verify login OTP
  async verifyLoginOtp(adminId, otpCode) {
    const otp = await prisma.adminLoginOtp.findFirst({
      where: {
        adminId,
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
    await prisma.adminLoginOtp.update({
      where: { id: otp.id },
      data: { used: true },
    });

    return otp;
  }
}

export default new AdminModel();


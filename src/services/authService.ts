import { prisma } from '../config/prisma';

export const getUserByPhoneNumber = (phone: string) => {
  return prisma.user.findUnique({ where: { phone } });
};

export const getOtpByPhoneNumber = (phone: string) => {
  return prisma.otp.findUnique({ where: { phone } });
};

export const createOtp = (otpData: any) => {
  return prisma.otp.create({ data: otpData });
};

export const updateOtp = (id: number, otpData: any) => {
  return prisma.otp.update({ where: { id }, data: otpData });
};

export const createUser = (userData: any) => {
  return prisma.user.create({ data: userData });
};

export const updateUser = (id: number, userData: any) => {
  return prisma.user.update({ where: { id }, data: userData });
};

export const getUserById = (id: number) => {
  return prisma.user.findUnique({ where: { id } });
};

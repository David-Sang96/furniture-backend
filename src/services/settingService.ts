import { prisma } from '../config/prisma';

export const getSettingStatus = (key: string) => {
  return prisma.setting.findUnique({ where: { key } });
};

export const createOrUpdateSetting = (key: string, value: string) => {
  return prisma.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
};

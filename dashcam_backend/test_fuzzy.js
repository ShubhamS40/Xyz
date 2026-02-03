
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const terminalSN = '86893506012277'; // 14 digits
  console.log(`Testing getDeviceId logic for SN: ${terminalSN}`);

  try {
    let device = await prisma.device.findUnique({ where: { imei: terminalSN } });
    console.log('findUnique result:', device ? device.imei : 'null');

    if (!device && terminalSN.length === 14) {
        console.log('Attempting fuzzy search...');
        device = await prisma.device.findFirst({
            where: { imei: { startsWith: terminalSN } }
        });
        console.log('findFirst startsWith result:', device ? device.imei : 'null');
    }
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();

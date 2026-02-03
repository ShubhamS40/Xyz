
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔍 Checking Device Table...');
    const devices = await prisma.device.findMany();
    console.log(`Found ${devices.length} devices.`);
    devices.forEach(d => {
      console.log(`- Device: ${d.deviceName} (Model: ${d.deviceModel}, IMEI: ${d.imei})`);
    });

    console.log('\n🔍 Checking VL502 Location Data...');
    const locations = await prisma.vL502Location.groupBy({
      by: ['imei'],
      _count: true,
      _max: { timestamp: true }
    });
    console.log('Locations per IMEI:', locations);

    console.log('\n🔍 Checking VL502 OBD Data...');
    const obdData = await prisma.vL502OBDData.groupBy({
      by: ['imei'],
      _count: true,
      _max: { eventTime: true }
    });
    console.log('OBD Data per IMEI:', obdData);

    if (obdData.length > 0) {
      console.log('\n🔍 Latest OBD Record Detail:');
      const latestOBD = await prisma.vL502OBDData.findFirst({
        orderBy: { eventTime: 'desc' }
      });
      console.log(latestOBD);
    } else {
        console.log('\n❌ No OBD data found in the database.');
    }

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();

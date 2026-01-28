import XLSX from "xlsx";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const filePath = "C:\\Users\\Shiva\\Desktop\\ganesh\\mp.xls";

/**
 * Convert Excel date serial number to JavaScript Date
 */
const excelDateToJS = (v) => {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof v === "number") {
    return new Date((v - 25569) * 86400 * 1000);
  }
  // Handle string dates like "2026-01-07 15:18:42"
  if (typeof v === "string") {
    const parsed = new Date(v);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  const parsed = new Date(v);
  return isNaN(parsed.getTime()) ? null : parsed;
};

/**
 * Parse azimuth from string like "Due West(Direction287)"
 */
const parseAzimuth = (val) => {
  if (!val) return null;
  const str = String(val);
  // Extract number from "Direction287" pattern
  const match = str.match(/Direction(\d+)/i);
  if (match) {
    return parseNumber(match[1]);
  }
  // If it's already a number, return it
  return parseNumber(val);
};

/**
 * Safely parse number fields
 */
const parseNumber = (val) => {
  if (val === null || val === undefined || val === "") return null;
  const num = Number(val);
  return isNaN(num) ? null : num;
};

/**
 * Safely parse string fields
 */
const parseString = (val) => {
  if (val === null || val === undefined) return null;
  return String(val).trim() || null;
};

async function importDeviceData() {
  try {
    console.log("📂 Reading Excel file...");
    const workbook = XLSX.readFile(filePath, { cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    
    const rows = XLSX.utils.sheet_to_json(sheet, { 
      raw: false,
      defval: null,
      blankrows: false
    });

    console.log(`✅ Total rows found: ${rows.length}`);
    console.log(`📊 Data rows (excluding header): ${rows.length - 1}\n`);

    let successCount = 0;
    let failCount = 0;
    let skippedCount = 0;
    let skippedReasons = {
      noImei: 0,
      deviceNotFound: 0,
      otherError: 0
    };
    const deviceCache = new Map();

    // Start from index 1 to skip the header row (Row 0)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      
      try {
        const imei = parseString(row["__EMPTY_1"]);
        
        if (!imei) {
          skippedCount++;
          skippedReasons.noImei++;
          if (skippedReasons.noImei <= 3) {
            console.warn(`⚠️  Row ${i + 1}: No IMEI found`);
          }
          continue;
        }

        // Get or fetch device from cache
        let device = deviceCache.get(imei);
        if (!device) {
          device = await prisma.device.findUnique({
            where: { imei },
          });
          
          if (!device) {
            skippedCount++;
            skippedReasons.deviceNotFound++;
            if (skippedReasons.deviceNotFound <= 5) {
              console.warn(`⚠️  Row ${i + 1}: Device with IMEI ${imei} not found - you may need to add it to the Device table first`);
            }
            continue;
          }
          
          deviceCache.set(imei, device);
          console.log(`✅ Found device: ${device.deviceName || imei}`);
        }

        // Parse position time (string format: "2026-01-07 15:18:42")
        const positionTime = excelDateToJS(row["__EMPTY_8"]);

        // Parse coordinates
        let latitude = null;
        let longitude = null;
        
        const coordsStr = parseString(row["__EMPTY_14"]);
        if (coordsStr && coordsStr.includes(",")) {
          const [lat, lng] = coordsStr.split(",").map(s => parseNumber(s.trim()));
          latitude = lat;
          longitude = lng;
        }

        const speed = parseNumber(row["__EMPTY_9"]);

        // Parse ignition
        const ignitionStr = parseString(row["__EMPTY_7"]);
        const ignition = ignitionStr === "ON" || ignitionStr === "1" || ignitionStr === "Yes";
        const accStatus = ignition ? 1 : 0;

        // Parse azimuth - extract number from "Due West(Direction287)"
        const azimuth = parseAzimuth(row["__EMPTY_10"]);
        
        const satellites = parseNumber(row["__EMPTY_12"]);
        const positionType = parseString(row["__EMPTY_11"]);
        const dataType = parseString(row["__EMPTY_13"]);
        const address = parseString(row["__EMPTY_15"]);

        // Create record
        await prisma.deviceData.create({
          data: {
            deviceId: device.id,
            latitude,
            longitude,
            speed,
            accStatus,
            ignition,
            positionTime: positionTime || new Date(),
            azimuth,
            positionType,
            dataType,
            coordinates: latitude && longitude ? `${latitude},${longitude}` : null,
            address,
            satellites,
            receivedAt: new Date(),
          },
        });

        // Update device status (once per device)
        if (!deviceCache.has(`updated_${imei}`)) {
          await prisma.device.update({
            where: { id: device.id },
            data: {
              lastSeen: positionTime || new Date(),
              status: "online",
              activationDate: device.activationDate || new Date(),
            },
          });
          deviceCache.set(`updated_${imei}`, true);
        }

        successCount++;
        
        if (successCount % 100 === 0) {
          console.log(`📊 Progress: ${successCount} records imported...`);
        }

      } catch (error) {
        console.error(`❌ Row ${i + 1}:`, error.message);
        failCount++;
        skippedReasons.otherError++;
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("📈 FINAL Import Summary:");
    console.log("=".repeat(60));
    console.log(`✅ Successfully imported: ${successCount}`);
    console.log(`⚠️  Skipped: ${skippedCount}`);
    console.log(`   - No IMEI: ${skippedReasons.noImei}`);
    console.log(`   - Device not found in DB: ${skippedReasons.deviceNotFound}`);
    console.log(`   - Other errors: ${skippedReasons.otherError}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`📝 Total data rows in Excel: ${rows.length - 1}`);
    console.log("=".repeat(60));

    if (skippedReasons.deviceNotFound > 0) {
      console.log("\n💡 TIP: Some IMEIs were not found in the Device table.");
      console.log("   Make sure to add those devices first before importing their data.");
    }

  } catch (error) {
    console.error("💥 Fatal error:", error);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
    console.log("\n🔌 Database connection closed");
  }
}

await importDeviceData();

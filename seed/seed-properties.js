import mongoose from "mongoose";
import dotenv from "dotenv";
import { connectDB } from "../lib/db.js";
import { Plot } from "../src/models/plot.model.js";
import { Floor } from "../src/models/floor.model.js";
import { RentableUnit } from "../src/models/rentableUnit.model.js";

dotenv.config();

// ==========================================
// DETERMINISTIC UNIT CODE GENERATOR
// ==========================================
/**
 * Computes a standardized composite unit code based on Plot ID (plotId), Floor level, and Unit sequence index.
 *
 * Rules:
 * - plot-a / plot-b / plot-c -> Prefix is 'A', 'B', 'C'
 * - flat                     -> Prefix is 'FLAT'
 * - Level 0 (Ground Floor)   -> [PREFIX]-0[INDEX] (e.g. A-01, B-01, FLAT-01)
 * - Level >= 1 (Upper Floor) -> [PREFIX]-[LEVEL][INDEX] (e.g. B-101, FLAT-101)
 */
export const generateUnitCode = (plotId, floorLevel, unitIndex) => {
  let prefix = "UNIT";
  const trimmed = (plotId || "").trim().toLowerCase();

  if (trimmed.startsWith("plot-")) {
    prefix = trimmed.replace("plot-", "").toUpperCase();
  } else if (trimmed.startsWith("flat")) {
    prefix = "FLAT";
  } else {
    prefix = trimmed.toUpperCase();
  }

  const paddedIndex = String(unitIndex).padStart(2, "0");
  if (floorLevel === 0) {
    return `${prefix}-${paddedIndex}`;
  }
  return `${prefix}-${floorLevel}${paddedIndex}`;
};

// ==========================================
// PHYSICAL REAL ESTATE LAYOUT MOCK DATA
// (Extracted from Frontend - Tenants Excluded)
// ==========================================
const propertiesData = [
  {
    id: "plot-a",
    name: "Plot A",
    subtitle: "Ground Floor Dual Unit House",
    type: "Single Story House",
    gridPos: { x: 40, y: 60, width: 540, height: 360 },
    floors: [
      {
        level: 0,
        label: "Ground Floor",
        units: [
          {
            name: "Room 1 (Front)",
            type: "Single Rented Room",
            rent: 5000,
            status: "vacant",
            color: "#10b981",
            bio: "Ground floor front room with excellent natural light and cross ventilation.",
            specs: {
              address:
                "Plot A, Ground Floor Front, 12 Park Road, Block C, Kolkata 700091",
              floorLevel: "Ground Floor (0F)",
              bedrooms: 1,
              bathrooms: 1,
              kitchenType: "Shared Kitchen",
              diningArea: "None",
              hasBalcony: false,
              roofAccess: "Shared Open Roof Access",
              wasteManagement: "Daily Municipal Door-step Waste Collection",
              sqft: 220,
              furnishing: "Semi-Furnished",
              exitDoors: 1,
              facingDirection: "North-East",
              waterSource:
                "Municipal Corporation + Submersible Pump Dual Supply",
              electricityProvider: "WBSEDCL (West Bengal State Electricity)",
              electricityRatePerUnit: 8.5,
              meterType: "Independent Sub-Meter",
              parkingAvailable: "Two-Wheeler Only",
              securityDeposit: 10000,
              noticePeriodMonths: 1,
            },
            snapshots: {
              coverImage:
                "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80",
              gallery: [
                {
                  id: "img-1",
                  type: "image",
                  url: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80",
                  caption: "Main Living Space",
                },
                {
                  id: "img-2",
                  type: "image",
                  url: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80",
                  caption: "Attached Washroom",
                },
                {
                  id: "vid-1",
                  type: "video",
                  url: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80",
                  caption: "360 Room Walkthrough",
                },
              ],
              virtualTourUrl: "https://example.com/tour/A-01",
            },
          },
          {
            name: "Room 2 (Rear)",
            type: "Single Rented Room",
            rent: 4500,
            status: "vacant",
            color: "#94a3b8",
            bio: "Ground floor rear room, freshly painted with quiet backyard views. Ready for immediate occupancy.",
            specs: {
              address:
                "Plot A, Ground Floor Rear, 12 Park Road, Block C, Kolkata 700091",
              floorLevel: "Ground Floor (0F)",
              bedrooms: 1,
              bathrooms: 1,
              kitchenType: "Shared Kitchen",
              diningArea: "None",
              hasBalcony: false,
              roofAccess: "Shared Open Roof Access",
              wasteManagement: "Daily Municipal Door-step Waste Collection",
              sqft: 195,
              furnishing: "Unfurnished",
              exitDoors: 1,
              facingDirection: "East-Facing",
              waterSource:
                "Municipal Corporation + Submersible Pump Dual Supply",
              electricityProvider: "WBSEDCL (West Bengal State Electricity)",
              electricityRatePerUnit: 8.5,
              meterType: "Independent Sub-Meter",
              parkingAvailable: "Two-Wheeler Only",
              securityDeposit: 9000,
              noticePeriodMonths: 1,
            },
            snapshots: {
              coverImage:
                "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=800&q=80",
              gallery: [
                {
                  id: "img-1",
                  type: "image",
                  url: "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=800&q=80",
                  caption: "Rear Bedroom View",
                },
                {
                  id: "img-2",
                  type: "image",
                  url: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80",
                  caption: "Freshly Painted Walls",
                },
              ],
              virtualTourUrl: null,
            },
          },
        ],
      },
    ],
  },
  {
    id: "plot-b",
    name: "Plot B",
    subtitle: "Two-Story Multi-Tenant Residence",
    type: "Multi-Story Residence",
    gridPos: { x: 620, y: 60, width: 540, height: 360 },
    floors: [
      {
        level: 1,
        label: "1st Floor",
        units: [
          {
            name: "1st Floor Unit",
            type: "Full Floor Suite",
            rent: 9000,
            status: "vacant",
            color: "#10b981",
            bio: "Independent 1st floor spacious suite with separate entrance and private washroom.",
            specs: {
              address:
                "Plot B, 1st Floor Suite, 14 Park Road, Block C, Kolkata 700091",
              floorLevel: "1st Floor (1F)",
              bedrooms: 2,
              bathrooms: 1,
              kitchenType: "Private Modular Kitchen",
              diningArea: "Attached to Living Room",
              hasBalcony: true,
              roofAccess: "Direct Private Roof Access",
              wasteManagement: "Daily Municipal Door-step Waste Collection",
              sqft: 480,
              furnishing: "Semi-Furnished",
              exitDoors: 2,
              facingDirection: "South-Facing",
              waterSource: "Automatic Submersible Deep Well Pump",
              electricityProvider: "WBSEDCL (West Bengal State Electricity)",
              electricityRatePerUnit: 9.0,
              meterType: "Dedicated WBSEDCL Meter",
              parkingAvailable: "Covered Two-Wheeler + Car Space",
              securityDeposit: 18000,
              noticePeriodMonths: 2,
            },
            snapshots: {
              coverImage:
                "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80",
              gallery: [
                {
                  id: "img-1",
                  type: "image",
                  url: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80",
                  caption: "Spacious Suite Living Room",
                },
                {
                  id: "img-2",
                  type: "image",
                  url: "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80",
                  caption: "Private Modular Kitchen",
                },
                {
                  id: "vid-1",
                  type: "video",
                  url: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80",
                  caption: "1st Floor Suite Tour",
                },
              ],
              virtualTourUrl: "https://example.com/tour/B-101",
            },
          },
        ],
      },
      {
        level: 0,
        label: "Ground Floor",
        units: [
          {
            name: "Room 1 (Ground)",
            type: "Ground Room A",
            rent: 5500,
            status: "vacant",
            color: "#10b981",
            bio: "Ground floor front room with independent entrance and extra utility storage space.",
            specs: {
              address:
                "Plot B, Ground Floor Front, 14 Park Road, Block C, Kolkata 700091",
              floorLevel: "Ground Floor (0F)",
              bedrooms: 1,
              bathrooms: 1,
              kitchenType: "Attached Kitchenette",
              diningArea: "None",
              hasBalcony: false,
              roofAccess: "Shared Open Roof Access",
              wasteManagement: "Daily Municipal Door-step Waste Collection",
              sqft: 240,
              furnishing: "Semi-Furnished",
              exitDoors: 1,
              facingDirection: "North-Facing",
              waterSource: "Automatic Submersible Deep Well Pump",
              electricityProvider: "WBSEDCL (West Bengal State Electricity)",
              electricityRatePerUnit: 8.5,
              meterType: "Independent Sub-Meter",
              parkingAvailable: "Two-Wheeler Only",
              securityDeposit: 11000,
              noticePeriodMonths: 1,
            },
            snapshots: {
              coverImage:
                "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80",
              gallery: [
                {
                  id: "img-1",
                  type: "image",
                  url: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80",
                  caption: "Front Room Entry",
                },
              ],
              virtualTourUrl: null,
            },
          },
          {
            name: "Room 2 (Ground)",
            type: "Ground Room B",
            rent: 5200,
            status: "vacant",
            color: "#f59e0b",
            bio: "Ground floor side room with ample natural lighting and window grill security.",
            specs: {
              address:
                "Plot B, Ground Floor Side, 14 Park Road, Block C, Kolkata 700091",
              floorLevel: "Ground Floor (0F)",
              bedrooms: 1,
              bathrooms: 1,
              kitchenType: "Shared Kitchen",
              diningArea: "None",
              hasBalcony: false,
              roofAccess: "Shared Open Roof Access",
              wasteManagement: "Daily Municipal Door-step Waste Collection",
              sqft: 210,
              furnishing: "Unfurnished",
              exitDoors: 1,
              facingDirection: "East-Facing",
              waterSource: "Automatic Submersible Deep Well Pump",
              electricityProvider: "WBSEDCL (West Bengal State Electricity)",
              electricityRatePerUnit: 8.5,
              meterType: "Independent Sub-Meter",
              parkingAvailable: "Two-Wheeler Only",
              securityDeposit: 10000,
              noticePeriodMonths: 1,
            },
            snapshots: {
              coverImage:
                "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80",
              gallery: [
                {
                  id: "img-1",
                  type: "image",
                  url: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80",
                  caption: "Side Room Area",
                },
              ],
              virtualTourUrl: null,
            },
          },
        ],
      },
    ],
  },
  {
    id: "flat",
    name: "Flat",
    subtitle: "Standalone Residential Building",
    type: "Apartment Building",
    gridPos: { x: 40, y: 450, width: 1120, height: 380 },
    floors: [
      {
        level: 0,
        label: "Ground Floor Flat",
        units: [
          {
            name: "Flat 101",
            type: "2BHK Apartment Flat",
            rent: 14000,
            status: "vacant",
            color: "#10b981",
            bio: "Self-contained 2BHK flat apartment featuring 2 bedrooms, hall, modular kitchen, and 2 washrooms.",
            specs: {
              address:
                "Sunshine Residency, Flat 101 Ground Floor, 22 Southern Avenue, Kolkata 700029",
              floorLevel: "Ground Floor (Flat 101)",
              bedrooms: 2,
              bathrooms: 2,
              kitchenType: "Private Modular Kitchen",
              diningArea: "Separate Dining Hall",
              hasBalcony: true,
              roofAccess: "Common Building Roof Terrace",
              wasteManagement: "Private Building Trash Collector",
              sqft: 850,
              furnishing: "Fully-Furnished",
              exitDoors: 2,
              facingDirection: "South-East",
              waterSource: "KMC Municipal Water + Overhead Storage Tank",
              electricityProvider: "CESC (Calcutta Electric Supply Corp)",
              electricityRatePerUnit: 9.5,
              meterType: "Dedicated CESC Meter",
              parkingAvailable: "Covered Car Parking Garage",
              securityDeposit: 28000,
              noticePeriodMonths: 2,
            },
            snapshots: {
              coverImage:
                "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80",
              gallery: [
                {
                  id: "img-1",
                  type: "image",
                  url: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80",
                  caption: "2BHK Living Room",
                },
                {
                  id: "img-2",
                  type: "image",
                  url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
                  caption: "Master Bedroom",
                },
                {
                  id: "vid-1",
                  type: "video",
                  url: "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=800&q=80",
                  caption: "Full Flat Video Walkthrough",
                },
              ],
              virtualTourUrl: "https://example.com/tour/FLAT-101",
            },
          },
        ],
      },
    ],
  },
];

// ==========================================
// SEEDING LOGIC
// ==========================================
export const seedProperties = async () => {
  try {
    console.log("Connecting to database...");
    await connectDB();

    console.log("\nClearing existing property layout collections...");
    await RentableUnit.deleteMany({});
    await Floor.deleteMany({});
    await Plot.deleteMany({});
    console.log("✓ Cleared Plot, Floor, and RentableUnit collections.");

    let totalPlots = 0;
    let totalFloors = 0;
    let totalUnits = 0;

    for (const plotData of propertiesData) {
      // 1. Create Plot
      const plotDoc = await Plot.create({
        plotId: plotData.id,
        name: plotData.name,
        subtitle: plotData.subtitle,
        type: plotData.type,
        gridPos: plotData.gridPos,
      });
      totalPlots++;
      console.log(`\n🏡 Created Plot: ${plotDoc.name} [ID: ${plotDoc.plotId}]`);

      // 2. Create Floors for this Plot
      for (const floorData of plotData.floors) {
        const floorDoc = await Floor.create({
          plotId: plotDoc._id,
          level: floorData.level,
          label: floorData.label,
        });
        totalFloors++;
        console.log(
          `  🏢 Created Floor: ${floorDoc.label} (Level ${floorDoc.level})`,
        );

        // 3. Create RentableUnits with Deterministic Unit Codes
        for (let i = 0; i < floorData.units.length; i++) {
          const unitData = floorData.units[i];
          const unitIndex = i + 1; // 1-based index per floor

          const computedUnitCode = generateUnitCode(
            plotDoc.plotId,
            floorDoc.level,
            unitIndex,
          );

          const unitDoc = await RentableUnit.create({
            unitCode: computedUnitCode,
            plotId: plotDoc._id,
            floorId: floorDoc._id,
            name: unitData.name,
            type: unitData.type,
            rent: unitData.rent,
            status: "vacant",
            color: unitData.color,
            bio: unitData.bio,
            specs: unitData.specs,
            snapshots: unitData.snapshots,
            tenantId: null,
          });
          totalUnits++;
          console.log(
            `    🔑 Created Unit: ${unitDoc.name} -> Code: ${unitDoc.unitCode}`,
          );
        }
      }
    }

    console.log("\n==========================================");
    console.log(`🎉 PROPERTY SEEDING COMPLETED SUCCESSFULLY!`);
    console.log(`Total Plots:         ${totalPlots}`);
    console.log(`Total Floors:        ${totalFloors}`);
    console.log(`Total RentableUnits: ${totalUnits}`);
    console.log("==========================================\n");

    await mongoose.connection.close();
    console.log("Database connection closed.");
    process.exit(0);
  } catch (error) {
    console.error("Error during property seeding:", error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

seedProperties();

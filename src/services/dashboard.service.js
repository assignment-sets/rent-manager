import { Plot } from "../models/plot.model.js";
import { Floor } from "../models/floor.model.js";
import { RentableUnit } from "../models/rentableUnit.model.js";

/**
 * Format a Date object into human readable format matching mock (e.g. '10 Jan 2024')
 */
const formatDate = (date) => {
  if (!date) return null;
  const d = new Date(date);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

/**
 * Computes days occupied between moveInDate and today
 */
const calculateDaysOccupied = (moveInDate) => {
  if (!moveInDate) return 0;
  const diffTime = Math.abs(new Date() - new Date(moveInDate));
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Retrieve and aggregate the entire property hierarchy:
 * Plot -> Floor -> RentableUnit -> Tenant (matching frontend propertiesData format)
 */
export const getAggregatedDashboardProperties = async () => {
  // 1. Fetch all plots, floors, and units concurrently
  const [plots, floors, units] = await Promise.all([
    Plot.find().lean(),
    Floor.find().sort({ level: -1 }).lean(),
    RentableUnit.find()
      .populate({
        path: "tenantId",
        populate: {
          path: "userId",
          select: "name email phone role",
        },
      })
      .lean(),
  ]);

  // 2. Map Units grouped by floorId
  const unitsByFloorId = new Map();
  units.forEach((unit) => {
    const floorKey = unit.floorId.toString();
    if (!unitsByFloorId.has(floorKey)) {
      unitsByFloorId.set(floorKey, []);
    }

    let tenantPayload = null;
    if (unit.tenantId) {
      const t = unit.tenantId;
      const u = t.userId || {};
      tenantPayload = {
        id: t._id,
        userId: u._id || "",
        name: u.name || "",
        phone: u.phone || "",
        whatsappPhone: t.whatsappPhone || "",
        email: u.email || "",
        aadhar: t.aadharNumber || "",
        permanentAddress: t.permanentAddress || "",
        occupation: t.occupation || "",
        occupancyType: t.occupancyType || "Solo / Bachelor",
        occupantsCount: t.occupantsCount || 1,
        agreementStatus: t.agreementStatus || "NOT_SUBMITTED",
        rejectionReason: t.rejectionReason || "",
        isAgreementVerified: t.isAgreementVerified || false,
        documents: t.documents || {},
        moveInDate: formatDate(t.moveInDate),
        daysOccupied: calculateDaysOccupied(t.moveInDate),
        leaseEnd: formatDate(t.leaseEnd),
        rentStatus: t.rentStatus || "Pending",
        rentDueDate: t.rentDueDate || "5th of every month",
        emergencyContact: t.emergencyContact || {
          name: "",
          relation: "",
          phone: "",
        },
      };
    }

    unitsByFloorId.get(floorKey).push({
      id: unit.unitCode, // UI expects string unit code (e.g. 'A-01', 'B-101')
      name: unit.name,
      type: unit.type,
      rent: unit.rent,
      status: unit.status,
      color: unit.color,
      bio: unit.bio,
      specs: unit.specs || {},
      snapshots: unit.snapshots || {
        coverImage: "",
        gallery: [],
        virtualTourUrl: null,
      },
      tenant: tenantPayload,
    });
  });

  // 3. Map Floors grouped by plotId
  const floorsByPlotId = new Map();
  floors.forEach((floor) => {
    const plotKey = floor.plotId.toString();
    if (!floorsByPlotId.has(plotKey)) {
      floorsByPlotId.set(plotKey, []);
    }

    const floorUnits = unitsByFloorId.get(floor._id.toString()) || [];
    floorsByPlotId.get(plotKey).push({
      level: floor.level,
      label: floor.label,
      units: floorUnits,
    });
  });

  // 4. Construct final propertiesData array
  const dashboardProperties = plots.map((plot) => {
    const plotFloors = floorsByPlotId.get(plot._id.toString()) || [];
    return {
      id: plot.plotId, // e.g. 'plot-a', 'plot-b', 'flat'
      name: plot.name,
      subtitle: plot.subtitle,
      type: plot.type,
      gridPos: plot.gridPos,
      floors: plotFloors,
    };
  });

  return dashboardProperties;
};

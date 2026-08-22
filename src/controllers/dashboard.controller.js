import * as dashboardService from "../services/dashboard.service.js";

/**
 * Get aggregated dashboard properties tree matching frontend propertiesData contract
 */
export const handleGetDashboardProperties = async (req, res) => {
  try {
    const data = await dashboardService.getAggregatedDashboardProperties();
    return res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

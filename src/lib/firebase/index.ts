// ────────────────────────────────────────────────────────────
// 🔥 FIREBASE — Entry Point
// Re-export ทุกอย่างเพื่อให้ใช้งานง่าย: import { ... } from '@/lib/firebase'
// ────────────────────────────────────────────────────────────

// ══════════════════════════════════════════════════════════
// Config & Database Instance
// ══════════════════════════════════════════════════════════
export { db } from './config';

// ══════════════════════════════════════════════════════════
// Types & Constants
// ══════════════════════════════════════════════════════════
export type * from './types';
export {
  // Orchard
  FARM_MAP_ORCHARDS,
  DURIAN_FARM_NAMES, // deprecated
  getVarietiesFor,
  getTreeCodePrefix,
  hasFarmMap,
  isDurianFarm, // deprecated
  isMangosteenFarm,
  
  // Water
  DURIAN_GROWTH_STAGE_LABEL,
  
  // Fertilizer
  GROWTH_STAGE_LABEL,
  
  // Spray
  SPRAY_GROUP_LABEL,
  
  // Work
  WORK_TYPE_LABEL,
  
  // Grades
  DEFAULT_GRADES,
  
  // Medicine & Nutrient
  MEDICINE_CATEGORY_LABEL,
  MEDICINE_UNIT_LABEL,
  MEDICINE_TYPE_LABEL,
  NUTRIENT_TYPE_LABEL,
} from './types';

// ══════════════════════════════════════════════════════════
// 🏞️ Orchards
// ══════════════════════════════════════════════════════════
export {
  addOrchard,
  getOrchards,
  subscribeOrchards,
  subscribeOrchard,
  getFarmMapConfig,
  saveFarmMapConfig,
  getOrchardStats,
  saveOrchardStats,
} from './orchards';

// ══════════════════════════════════════════════════════════
// 👤 Auth & Users
// ══════════════════════════════════════════════════════════
export {
  hashPassword,
  getUserByUsername,
  getUserById,
  getAllUsers,
  createUser,
  updateUser,
  updateUserProfile,
  resetUserPassword,
  deleteUser,
  loginWithCredentials,
  ensureAdminSeeded,
} from './auth';

// ══════════════════════════════════════════════════════════
// 🌳 Tree Profiles
// ══════════════════════════════════════════════════════════
export {
  addTreeProfile,
  getTreeProfiles,
  updateTreeProfile,
  deleteTreeProfile,
} from './trees';

// ══════════════════════════════════════════════════════════
// 🌿 Care Records
// ══════════════════════════════════════════════════════════
export {
  // Legacy care records
  addCareRecord,
  getCareRecords,
  deleteCareRecord,
  
  // Water
  getWaterSetting,
  saveWaterSetting,
  addWaterRecord,
  getWaterRecords,
  deleteWaterRecord,
  addStressPeriod,
  getStressPeriods,
  deleteStressPeriod,
  
  // Fertilizer
  getFertilizerFormulas,
  addFertilizerFormula,
  updateFertilizerFormula,
  deleteFertilizerFormula,
  addFertilizerRecord,
  getFertilizerRecords,
  deleteFertilizerRecord,
  
  // Spray
  addSprayRecord,
  getSprayRecords,
  deleteSprayRecord,
  
  // Durian Fruit
  addDurianFruitRecord,
  getDurianFruitRecords,
  deleteDurianFruitRecord,
} from './care';

// ══════════════════════════════════════════════════════════
// 💰 Finance
// ══════════════════════════════════════════════════════════
export {
  // Legacy transactions
  addTransaction,
  getTransactions,
  deleteTransaction,
  
  // General Expense
  addGeneralExpense,
  getGeneralExpenses,
  deleteGeneralExpense,
  
  // Upgrade Expense
  addUpgradeExpense,
  getUpgradeExpenses,
  deleteUpgradeExpense,
  
  // Sales
  getOrchardGrades,
  saveOrchardGrades,
  addSaleRecord,
  getSaleRecords,
  deleteSaleRecord,
} from './finance';

// ══════════════════════════════════════════════════════════
// 🏥 Hospital
// ══════════════════════════════════════════════════════════
export {
  addHospitalRecord,
  getHospitalRecords,
  updateHospitalRecord,
  deleteHospitalRecord,
} from './hospital';

// ══════════════════════════════════════════════════════════
// 📦 Stock (คลังสารเคมี)
// ══════════════════════════════════════════════════════════
export {
  // Medicine
  addMedicineItem,
  getMedicineItems,
  updateMedicineItem,
  deleteMedicineItem,
  
  // Nutrient
  addNutrientItem,
  getNutrientItems,
  updateNutrientItem,
  deleteNutrientItem,
  
  // Deduction
  deductFromStock,
} from './stock';

// ══════════════════════════════════════════════════════════
// 📡 Realtime Subscriptions
// ══════════════════════════════════════════════════════════
export {
  subscribeCollection,
  subscribeDocByOrchard,
} from './subscriptions';

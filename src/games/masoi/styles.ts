import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#262421" },
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },

  // ---- Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  side: { width: 96, paddingVertical: 4 },
  backText: { fontSize: 15, fontWeight: "700", color: "#7FA650" },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: "800",
    color: "#F2F2F2",
    textAlign: "center",
  },
  subBackBtn: { paddingVertical: 8, marginBottom: 4 },
  subBackText: { color: "#7FA650", fontSize: 14, fontWeight: "700" },

  // ---- Card containers
  card: {
    backgroundColor: "#3A3733",
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowGap: { flexDirection: "row", gap: 10, marginTop: 10 },
  cardTitle: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  gridHint: { color: "#A8A39B", fontSize: 12, marginVertical: 8 },

  // ---- Grid board (seat layout)
  gridArea: { marginTop: 8 },
  gridRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -4,
  },
  gridCell: { paddingHorizontal: 4, paddingVertical: 4 },
  gridSeat: {
    borderRadius: 10,
    borderWidth: 2,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 78,
  },
  seatDefault: { backgroundColor: "#4A4641", borderColor: "#6B655E" },
  seatSpecial: { backgroundColor: "#3F5A2A", borderColor: "#7FA650" },
  seatWolf: { backgroundColor: "#5C1E1E", borderColor: "#B22222" },
  seatSelected: { borderColor: "#F9A825", borderWidth: 3 },
  gridSeatNum: {
    color: "#A8A39B",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  gridSeatName: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    marginTop: 2,
    textAlign: "center",
  },
  gridSeatSubLabel: {
    color: "#D8D2C8",
    fontSize: 10,
    fontWeight: "700",
    marginTop: 3,
    textAlign: "center",
  },
  deadText: { textDecorationLine: "line-through", color: "#888" },

  // ---- Name setup grid
  nameGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -4,
    marginTop: 4,
  },
  nameCell: { paddingHorizontal: 4, paddingVertical: 4 },
  nameCellInner: {
    backgroundColor: "#2A2724",
    borderWidth: 1,
    borderColor: "#4A4641",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  nameSeatNum: {
    color: "#A8A39B",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  nameInput: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    paddingVertical: 4,
    paddingHorizontal: 0,
    marginTop: 2,
  },

  // ---- Deck composition
  compTotal: {
    fontSize: 15,
    fontWeight: "800",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: "hidden",
  },
  compTotalOk: { color: "#FFFFFF", backgroundColor: "#7FA650" },
  compTotalBad: { color: "#FFFFFF", backgroundColor: "#B33A3A" },
  roleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#4A4641",
    marginTop: 8,
  },
  roleName: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  roleFaction: {
    alignSelf: "flex-start",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 3,
    overflow: "hidden",
  },
  factionWolf: { color: "#FFCFCF", backgroundColor: "rgba(176,40,40,0.35)" },
  factionVillager: {
    color: "#C5DC9E",
    backgroundColor: "rgba(127,166,80,0.25)",
  },
  linkBtn: { marginTop: 10, alignItems: "center" },
  linkBtnText: { color: "#7FA650", fontSize: 13, fontWeight: "700" },

  // ---- Buttons
  primaryBtn: {
    backgroundColor: "#7C2929",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  primaryBtnDisabled: { opacity: 0.45 },
  primaryBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  secondaryBtn: {
    backgroundColor: "#4A4641",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 8,
  },
  secondaryBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },

  // ---- Night banner + scripts
  nightHeader: {
    backgroundColor: "#1F1D1B",
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    alignItems: "center",
  },
  nightProgress: {
    color: "#A8A39B",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },
  nightRoleName: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "800",
    marginTop: 4,
  },
  scriptLabel: {
    color: "#A8A39B",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },
  scriptText: {
    color: "#FFFFFF",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 6,
    fontStyle: "italic",
  },
  identifyCounter: {
    color: "#7FA650",
    fontSize: 14,
    fontWeight: "800",
    marginTop: 10,
  },

  // ---- Witch
  potionStatus: {
    fontSize: 11,
    fontWeight: "800",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    textTransform: "uppercase",
    overflow: "hidden",
  },
  potionStatusActive: {
    color: "#FFFFFF",
    backgroundColor: "#43A047",
  },
  potionStatusUsed: {
    color: "#A8A39B",
    backgroundColor: "#4A4641",
  },
  potionHint: {
    color: "#D8D2C8",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },
  potionBtn: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  potionBtnPoison: { backgroundColor: "#6A1B9A" },
  potionBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },

  // ---- Day
  logEntry: {
    color: "#D8D2C8",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 4,
  },

  // ---- Stepper
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2A2724",
    borderRadius: 8,
    paddingHorizontal: 4,
  },
  stepBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  stepBtnText: { color: "#FFFFFF", fontSize: 20, fontWeight: "800" },
  stepValue: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    minWidth: 30,
    textAlign: "center",
  },

  // ---- Endgame
  winBanner: {
    borderRadius: 12,
    paddingVertical: 24,
    alignItems: "center",
    marginBottom: 12,
  },
  winLabel: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
    opacity: 0.7,
  },
  winText: { color: "#FFFFFF", fontSize: 26, fontWeight: "800", marginTop: 4 },

  // ---- Reveal modals
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  revealCard: {
    borderRadius: 16,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: "center",
    width: "100%",
    maxWidth: 320,
  },
  revealLabel: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 2,
    opacity: 0.8,
  },
  revealName: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "800",
    marginTop: 6,
  },
  revealFaction: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    marginTop: 4,
  },
  revealBtn: {
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    marginTop: 20,
  },
  revealBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },

  // ---- Lover reveal modal
  loverScript: {
    color: "#FFFFFF",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
    textAlign: "center",
    fontStyle: "italic",
    opacity: 0.95,
  },
  loverPair: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },
  loverName: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
    maxWidth: 110,
    textAlign: "center",
  },
  loverHeart: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "800",
    marginHorizontal: 14,
  },
});

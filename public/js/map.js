// Shared helpers for all Leaflet maps across the app
const DEFAULT_CENTER = [26.4499, 80.3319]; // Kanpur, UP - change if needed
const DEFAULT_ZOOM = 13;

function createBaseMap(containerId, center = DEFAULT_CENTER, zoom = DEFAULT_ZOOM) {
  const map = L.map(containerId).setView(center, zoom);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
    maxZoom: 19,
  }).addTo(map);
  return map;
}

function statusColor(status) {
  const colors = {
    reported: "#E85D04",
    acknowledged: "#E9A825",
    in_progress: "#3B6EA5",
    resolved: "#2D6A4F",
    rejected: "#8B8378",
  };
  return colors[status] || "#4A5568";
}

function coloredIcon(color) {
  return L.divIcon({
    className: "custom-pin",
    html: `<span style="background:${color}"></span>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

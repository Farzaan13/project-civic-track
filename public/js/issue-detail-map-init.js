document.addEventListener("DOMContentLoaded", () => {
  const loc = window.ISSUE_LOCATION;
  if (!loc) return;

  const map = createBaseMap("detailMap", [loc.lat, loc.lng], 16);
  L.marker([loc.lat, loc.lng]).addTo(map).bindPopup(loc.title).openPopup();
});

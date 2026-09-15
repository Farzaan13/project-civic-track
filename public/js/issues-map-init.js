document.addEventListener("DOMContentLoaded", () => {
  const issues = window.ISSUES_DATA || [];
  const map = createBaseMap("issuesMap");

  if (issues.length === 0) return;

  const bounds = [];
  issues.forEach((issue) => {
    const icon = coloredIcon(statusColor(issue.status));
    const marker = L.marker([issue.lat, issue.lng], { icon }).addTo(map);
    marker.bindPopup(
      `<strong>${issue.title}</strong><br>${issue.category.replace("_", " ")}<br><a href="/issues/${issue.id}">View details</a>`
    );
    bounds.push([issue.lat, issue.lng]);
  });

  if (bounds.length > 0) {
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
  }
});

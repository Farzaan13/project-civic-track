document.addEventListener("DOMContentLoaded", () => {
  const map = createBaseMap("pinMap");
  let marker = null;

  const latInput = document.getElementById("lat");
  const lngInput = document.getElementById("lng");
  const mapHint = document.getElementById("mapHint");

  // Try to center on user's current location for convenience
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        map.setView([pos.coords.latitude, pos.coords.longitude], 15);
      },
      () => {
        /* user denied location - fall back to default center, no problem */
      }
    );
  }

  map.on("click", (e) => {
    const { lat, lng } = e.latlng;

    if (marker) {
      marker.setLatLng(e.latlng);
    } else {
      marker = L.marker(e.latlng, { draggable: true }).addTo(map);
      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        latInput.value = pos.lat;
        lngInput.value = pos.lng;
      });
    }

    latInput.value = lat;
    lngInput.value = lng;
    mapHint.textContent = `📍 Location pinned: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  });

  // Simple client-side hint - real AI classification happens server-side on submit
  const imagesInput = document.getElementById("images");
  const aiHint = document.getElementById("aiHint");
  imagesInput.addEventListener("change", () => {
    if (imagesInput.files.length > 0) {
      aiHint.textContent = "AI will suggest a category once you submit this report.";
    }
  });

  document.getElementById("issueForm").addEventListener("submit", (e) => {
    if (!latInput.value || !lngInput.value) {
      e.preventDefault();
      alert("Please click on the map to mark the issue location first.");
    }
  });
});

<script lang="ts">
  import { onMount } from 'svelte';
  import L from 'leaflet';
  import axios from 'axios';
  import 'leaflet/dist/leaflet.css';

  export let country = '';
  let map;
  let marker;
  let mapContainer;

  async function updateMap() {
    if (!country || !map) return;

    try {
      const res = await axios.get(
        `https://restcountries.com/v3.1/name/${country}?fullText=true`,
      );
      const c = res.data[0];
      const [lat, lon] = c.latlng;
      map.setView([lat, lon], 5);

      if (marker) {
        marker.setLatLng([lat, lon]);
      } else {
        marker = L.marker([lat, lon]).addTo(map);
      }
    } catch (error) {
      // silently ignore errors
      console.error('Failed to update map:', error);
    }
  }

  onMount(() => {
    map = L.map(mapContainer).setView([20, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);
  });

  // Reactive: run updateMap only when country changes AND map is ready
  $: if (map && country) {
    updateMap();
  }
</script>

<div
  bind:this={mapContainer}
  style="height: 400px; width: 100%; border: 1px solid #ccc; border-radius: 8px;"
></div>

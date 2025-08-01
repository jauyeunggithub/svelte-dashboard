<script>
  import { onDestroy } from 'svelte';
  import { Chart, registerables } from 'chart.js';
  import axios from 'axios';

  Chart.register(...registerables);

  export let country = '';

  let canvas;
  let chart;

  $: if (country) {
    loadChart();
  } else {
    destroyChart();
  }

  async function loadChart() {
    destroyChart();

    try {
      const res = await axios.get(`https://disease.sh/v3/covid-19/countries/${country}`);
      const data = res.data;

      const chartData = {
        labels: ['Cases', 'Deaths', 'Recovered'],
        datasets: [
          {
            label: `COVID-19 Stats for ${data.country}`,
            data: [data.cases, data.deaths, data.recovered],
            backgroundColor: ['#3b82f6', '#ef4444', '#10b981'],
          },
        ],
      };

      chart = new Chart(canvas, {
        type: 'bar',
        data: chartData,
        options: {
          responsive: true,
          scales: {
            y: {
              beginAtZero: true,
            },
          },
        },
      });
    } catch (error) {
      // Handle fetch error or invalid country gracefully
      destroyChart();
    }
  }

  function destroyChart() {
    if (chart) {
      chart.destroy();
      chart = null;
    }
  }

  onDestroy(() => {
    destroyChart();
  });
</script>

<canvas bind:this={canvas} aria-label="covid-chart" style="max-height: 300px; width: 100%;"></canvas>

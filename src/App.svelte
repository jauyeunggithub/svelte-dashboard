<script>
  import FormWidget from './components/FormWidget.svelte';
  import TableWidget from './components/TableWidget.svelte';
  import MapWidget from './components/MapWidget.svelte';
  import ChartWidget from './components/ChartWidget.svelte';

  let country = '';

  function handleSearch(event) {
    country = event.detail.trim();
  }
</script>

<style>
  main {
    display: flex;
    flex-wrap: wrap;
    gap: 20px; /* space between items */
    padding: 20px;
  }

  /* Each widget takes about half width */
  main > :global(*) {
    flex: 1 1 45%; /* grow, shrink, basis ~45% */
    min-width: 300px; /* optional: prevent too small */
  }

  /* Full width for these widgets */
  .full-width {
    flex-basis: 100%;
  }
</style>

<main>
  <FormWidget on:search={handleSearch} />
  <TableWidget {country} />
  <MapWidget {country} class="full-width" />
  <ChartWidget {country} class="full-width" />
</main>

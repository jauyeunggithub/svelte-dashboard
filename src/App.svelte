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
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-gap: 20px;
    padding: 20px;
  }
  .full-width {
    grid-column: 1 / -1;
  }
</style>

<main>
  <FormWidget on:search={handleSearch} />
  <TableWidget {country} />
  <MapWidget {country} class="full-width" />
  <ChartWidget {country} class="full-width" />
</main>

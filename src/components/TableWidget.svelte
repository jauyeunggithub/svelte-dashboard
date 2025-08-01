<script>
  import { onMount } from 'svelte';
  import axios from 'axios';

  export let country = '';
  let data = null;
  let loading = false;
  let error = '';

  // Reactive block:
  // If country has a value, fetch data.
  // If country is empty, reset data and error to clear the table/error message.
  $: {
    if (country) {
      fetchData();
    } else {
      data = null;
      error = '';
      loading = false; // Ensure loading is reset too
    }
  }

  async function fetchData() {
    loading = true;
    error = '';
    data = null; // Clear previous data immediately
    try {
      const res = await axios.get(
        `https://disease.sh/v3/covid-19/countries/${country}`,
      );
      data = res.data;
    } catch (e) {
      error = 'Error fetching data.';
    } finally {
      loading = false;
    }
  }
</script>

{#if loading}
  <p>Loading data...</p>
{:else if error}
  <p>{error}</p>
{:else if data}
  <table aria-label="covid-data-table">
    <thead>
      <tr>
        <th>Country</th>
        <th>Cases</th>
        <th>Deaths</th>
        <th>Recovered</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>{data.country}</td>
        <td>{data.cases.toLocaleString()}</td>
        <td>{data.deaths.toLocaleString()}</td>
        <td>{data.recovered.toLocaleString()}</td>
      </tr>
    </tbody>
  </table>
{:else}
  <p>Enter a country to see data.</p>
{/if}

<style>
  table {
    width: 100%;
    border-collapse: collapse;
  }
  th,
  td {
    border: 1px solid #ddd;
    padding: 8px;
  }
  th {
    background-color: #eee;
  }
</style>

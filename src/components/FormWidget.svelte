<script>
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();
  let searchTerm = '';

  function submit() {
    if (searchTerm.trim()) {
      dispatch('search', searchTerm.trim());
    }
  }
</script>

<div>
  <input
    aria-label="search-input"
    placeholder="Enter country name"
    bind:value={searchTerm}
    on:keydown={(e) => e.key === 'Enter' && submit()}
  />
  <button on:click={submit}>Search</button>
</div>

<style>
  div {
    display: flex;
    gap: 8px;
  }
  input {
    flex: 1;
    padding: 8px;
  }
</style>

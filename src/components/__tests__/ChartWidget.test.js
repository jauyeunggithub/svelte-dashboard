import { render, screen, act } from '@testing-library/svelte';
import { test, expect, vi, beforeEach, afterEach } from 'vitest';
import ChartWidget from '../ChartWidget.svelte';
import axios from 'axios';
import { Chart } from 'chart.js';

vi.mock('axios');

vi.mock('chart.js', async (importOriginal) => {
  const actual = await importOriginal();

  const MockChart = vi.fn(function (ctx, config) {
    const chartInstance = {
      destroy: vi.fn(),
    };
    return chartInstance;
  });

  MockChart.register = vi.fn();

  return {
    ...actual,
    Chart: MockChart,
  };
});

const mockCountryData = {
  country: 'Testland',
  cases: 1000,
  deaths: 50,
  recovered: 800,
};

beforeEach(() => {
  vi.clearAllMocks();
  axios.get.mockResolvedValue({ data: mockCountryData });
});

afterEach(() => {});

test('renders canvas element with correct aria-label', () => {
  render(ChartWidget);
  const canvas = screen.getByLabelText('covid-chart');
  expect(canvas).toBeInTheDocument();
  expect(canvas.tagName).toBe('CANVAS');
});

test('does not load chart initially if country prop is empty', () => {
  render(ChartWidget, { props: { country: '' } });

  expect(axios.get).not.toHaveBeenCalled();
  expect(Chart).not.toHaveBeenCalled();
  expect(Chart.register).toHaveBeenCalledTimes(1);
});

test('loads chart when country prop is provided', async () => {
  render(ChartWidget, { props: { country: 'USA' } });

  await act(async () => {
    await Promise.resolve();
  });

  expect(axios.get).toHaveBeenCalledTimes(1);
  expect(axios.get).toHaveBeenCalledWith('https://disease.sh/v3/covid-19/countries/USA');

  expect(Chart).toHaveBeenCalledTimes(1);
  const chartCallArgs = Chart.mock.calls[0];
  expect(chartCallArgs[0]).toBeInstanceOf(HTMLCanvasElement);
  expect(chartCallArgs[1].data.labels).toEqual(['Cases', 'Deaths', 'Recovered']);
  expect(chartCallArgs[1].data.datasets[0].data).toEqual([
    mockCountryData.cases,
    mockCountryData.deaths,
    mockCountryData.recovered,
  ]);
  expect(chartCallArgs[1].data.datasets[0].label).toBe(`COVID-19 Stats for ${mockCountryData.country}`);
  expect(Chart.register).toHaveBeenCalledTimes(1);
});

test('destroys existing chart and loads new one when country changes', async () => {
  const { rerender } = render(ChartWidget, { props: { country: 'USA' } });

  await act(async () => {
    await Promise.resolve();
  });

  expect(Chart).toHaveBeenCalledTimes(1);
  const initialChartInstance = Chart.mock.results[0].value;

  await act(async () => {
    rerender({ country: 'Canada' });
    await Promise.resolve();
  });

  expect(initialChartInstance.destroy).toHaveBeenCalledTimes(1);
  expect(axios.get).toHaveBeenCalledTimes(2);
  expect(axios.get).toHaveBeenCalledWith('https://disease.sh/v3/covid-19/countries/Canada');

  expect(Chart).toHaveBeenCalledTimes(2);
  const newChartInstance = Chart.mock.results[1].value;
  expect(newChartInstance.destroy).not.toHaveBeenCalled();
  expect(Chart.register).toHaveBeenCalledTimes(1);
});

test('destroys chart on component unmount', async () => {
  const { unmount } = render(ChartWidget, { props: { country: 'USA' } });

  await act(async () => {
    await Promise.resolve();
  });

  expect(Chart).toHaveBeenCalledTimes(1);
  const chartInstance = Chart.mock.results[0].value;

  await act(() => {
    unmount();
  });

  expect(chartInstance.destroy).toHaveBeenCalledTimes(1);
  expect(Chart.register).toHaveBeenCalledTimes(1);
});

test('handles API error gracefully and destroys chart', async () => {
  axios.get.mockRejectedValue(new Error('Network Error'));

  render(ChartWidget, { props: { country: 'InvalidCountry' } });

  await act(async () => {
    await Promise.resolve();
  });

  expect(axios.get).toHaveBeenCalledTimes(1);

  expect(Chart).not.toHaveBeenCalled();

  if (Chart.mock.results.length > 0) {
    const chartInstance = Chart.mock.results[0].value;
    expect(chartInstance.destroy).toHaveBeenCalledTimes(0);
  }
  expect(Chart.register).toHaveBeenCalledTimes(1);
});

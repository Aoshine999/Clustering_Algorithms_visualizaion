import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronDown } from 'lucide-react';
import * as d3 from 'd3';
import KMeans from 'ml-kmeans';
import { DBSCAN } from 'density-clustering';

interface DataPoint {
  x: number;
  y: number;
  cluster?: number;
}

const App: React.FC = () => {
  const [rawData, setRawData] = useState<DataPoint[]>([]);
  const [clusteredData, setClusteredData] = useState<DataPoint[]>([]);
  const [clusters, setClusters] = useState<number>(3);
  const [algorithm, setAlgorithm] = useState<string>('kmeans');
  const [epsilon, setEpsilon] = useState<number>(50);
  const [minPoints, setMinPoints] = useState<number>(3);
  const [error, setError] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const generateRandomData = useCallback(() => {
    const newData: DataPoint[] = Array.from({ length: 100 }, () => ({
      x: Math.random() * 800,
      y: Math.random() * 600,
    }));
    setRawData(newData);
  }, []);

  const runClustering = useCallback((data: DataPoint[], clusterCount: number) => {
    try {
      if (algorithm === 'kmeans') {
        const result = new KMeans(data.map(d => [d.x, d.y]), clusterCount);
        return data.map((d, i) => ({
          ...d,
          cluster: result.clusters[i],
        }));
      } else if (algorithm === 'dbscan') {
        const dbscan = new DBSCAN();
        const points = data.map(d => [d.x, d.y]);
        const clusters = dbscan.run(points, epsilon, minPoints);
        return data.map((d, i) => ({
          ...d,
          cluster: clusters.find(cluster => cluster.includes(i)) ? clusters.findIndex(cluster => cluster.includes(i)) : -1,
        }));
      }
      return data;
    } catch (err) {
      setError(`Error running clustering algorithm: ${err.message}`);
      return data;
    }
  }, [algorithm, epsilon, minPoints]);

  useEffect(() => {
    generateRandomData();
  }, [generateRandomData]);

  useEffect(() => {
    if (rawData.length > 0) {
      const newClusteredData = runClustering(rawData, clusters);
      setClusteredData(newClusteredData);
    }
  }, [rawData, clusters, runClustering]);

  useEffect(() => {
    if (!svgRef.current || clusteredData.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

    // Draw data points
    svg
      .selectAll('circle.datapoint')
      .data(clusteredData)
      .enter()
      .append('circle')
      .attr('class', 'datapoint')
      .attr('cx', d => d.x)
      .attr('cy', d => d.y)
      .attr('r', 5)
      .attr('fill', d => (d.cluster !== undefined && d.cluster !== -1 ? colorScale(d.cluster.toString()) : '#ccc'));

    // Draw cluster centroids for K-means
    if (algorithm === 'kmeans') {
      const centroids = d3.rollup(
        clusteredData,
        v => ({ x: d3.mean(v, d => d.x), y: d3.mean(v, d => d.y) }),
        d => d.cluster
      );

      svg
        .selectAll('.centroid')
        .data(Array.from(centroids.values()))
        .enter()
        .append('circle')
        .attr('class', 'centroid')
        .attr('cx', d => d.x)
        .attr('cy', d => d.y)
        .attr('r', 8)
        .attr('fill', 'none')
        .attr('stroke', 'black')
        .attr('stroke-width', 2);
    }
  }, [clusteredData, algorithm]);

  const handleGenerateData = () => {
    setError(null);
    generateRandomData();
  };

  const handleClusterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newClusters = parseInt(e.target.value);
    setClusters(newClusters);
  };

  const handleAlgorithmChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setAlgorithm(e.target.value);
  };

  const handleEpsilonChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEpsilon(parseInt(e.target.value));
  };

  const handleMinPointsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMinPoints(parseInt(e.target.value));
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-4xl font-bold mb-6 text-center text-gray-800">Clustering Algorithm Visualization</h1>
      <div className="mb-6 flex flex-wrap justify-center items-center gap-4">
        <div className="relative">
          <label htmlFor="algorithm" className="block text-sm font-medium text-gray-700 mb-1">
            Algorithm:
          </label>
          <select
            id="algorithm"
            className="appearance-none bg-white border border-gray-300 rounded-md py-2 pl-3 pr-10 text-sm leading-5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={algorithm}
            onChange={handleAlgorithmChange}
          >
            <option value="kmeans">K-means</option>
            <option value="dbscan">DBSCAN</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
            <ChevronDown size={16} />
          </div>
        </div>
        {algorithm === 'kmeans' && (
          <div>
            <label htmlFor="clusters" className="block text-sm font-medium text-gray-700 mb-1">
              Number of clusters:
            </label>
            <input
              id="clusters"
              type="number"
              min="1"
              max="10"
              value={clusters}
              onChange={handleClusterChange}
              className="border border-gray-300 rounded-md py-2 px-3 text-sm leading-5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        )}
        {algorithm === 'dbscan' && (
          <>
            <div>
              <label htmlFor="epsilon" className="block text-sm font-medium text-gray-700 mb-1">
                Epsilon (neighborhood size):
              </label>
              <input
                id="epsilon"
                type="number"
                min="1"
                max="100"
                value={epsilon}
                onChange={handleEpsilonChange}
                className="border border-gray-300 rounded-md py-2 px-3 text-sm leading-5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label htmlFor="minPoints" className="block text-sm font-medium text-gray-700 mb-1">
                Min Points (core point threshold):
              </label>
              <input
                id="minPoints"
                type="number"
                min="1"
                max="10"
                value={minPoints}
                onChange={handleMinPointsChange}
                className="border border-gray-300 rounded-md py-2 px-3 text-sm leading-5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </>
        )}
        <div>
          <button
            onClick={handleGenerateData}
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition duration-200"
          >
            Generate New Data
          </button>
        </div>
      </div>
      {error && (
        <div className="mb-4 text-center text-red-600 bg-red-100 border border-red-400 rounded-md p-2">
          {error}
        </div>
      )}
      <div className="flex justify-center">
        <svg ref={svgRef} width="800" height="600" className="bg-white border border-gray-300 rounded-md shadow-lg"></svg>
      </div>
    </div>
  );
};

export default App;
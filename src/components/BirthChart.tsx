import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { ZODIAC_SIGNS } from '../data/astrologyData';

interface BirthChartProps {
  planetPositions: { [key: string]: number }; // Degrees (0-360)
}

/** Shortest angular distance in degrees (0–180). */
function angularDistanceDeg(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return Math.min(d, 360 - d);
}

const MIN_PLANET_SEPARATION_DEG = 16;
const PLANET_RADIAL_STEP = 12;
const PLANET_BASE_INSET = 60;

const BirthChart: React.FC<BirthChartProps> = ({ planetPositions }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const width = 400;
    const height = 400;
    const radius = Math.min(width, height) / 2 - 20;

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .html('') // Clear previous
      .append('g')
      .attr('transform', `translate(${width / 2}, ${height / 2})`);

    const signs = Object.keys(ZODIAC_SIGNS);
    const anglePerSign = 360 / 12;

    // Draw Zodiac Wheel
    signs.forEach((sign, i) => {
      const startAngle = (i * anglePerSign - 90) * (Math.PI / 180);
      const endAngle = ((i + 1) * anglePerSign - 90) * (Math.PI / 180);

      const arc = d3.arc()
        .innerRadius(radius - 40)
        .outerRadius(radius)
        .startAngle(startAngle + Math.PI / 2)
        .endAngle(endAngle + Math.PI / 2);

      svg.append('path')
        .attr('d', arc as any)
        .attr('fill', 'transparent')
        .attr('stroke', 'rgba(255, 255, 255, 0.2)')
        .attr('stroke-width', 1);

      // Add Sign Symbols
      const labelAngle = (i * anglePerSign + anglePerSign / 2 - 90) * (Math.PI / 180);
      const labelX = (radius - 20) * Math.cos(labelAngle);
      const labelY = (radius - 20) * Math.sin(labelAngle);

      svg.append('text')
        .attr('x', labelX)
        .attr('y', labelY)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('fill', 'rgba(255, 255, 255, 0.6)')
        .attr('font-size', '14px')
        .text((ZODIAC_SIGNS as any)[sign].symbol);
    });

    // Draw Inner Circles
    svg.append('circle')
      .attr('r', radius - 40)
      .attr('fill', 'transparent')
      .attr('stroke', 'rgba(255, 255, 255, 0.1)')
      .attr('stroke-width', 1);

    // Draw planets on staggered radii when ecliptic longitudes are too close (avoids overlap).
    const sorted = Object.entries(planetPositions)
      .map(([planet, degree]) => ({
        planet,
        degree: ((Number(degree) % 360) + 360) % 360,
      }))
      .sort((a, b) => a.degree - b.degree);

    const placed: { degree: number; layer: number }[] = [];
    const minOrbitR = 32;

    for (const { planet, degree } of sorted) {
      let layer = 0;
      for (const p of placed) {
        if (angularDistanceDeg(p.degree, degree) < MIN_PLANET_SEPARATION_DEG) {
          layer = Math.max(layer, p.layer + 1);
        }
      }
      placed.push({ degree, layer });

      const orbitR = Math.max(
        minOrbitR,
        radius - PLANET_BASE_INSET - layer * PLANET_RADIAL_STEP,
      );
      const angle = (degree - 90) * (Math.PI / 180);
      const x = orbitR * Math.cos(angle);
      const y = orbitR * Math.sin(angle);

      const g = svg.append('g').attr('transform', `translate(${x},${y})`);

      g.append('circle')
        .attr('r', 4)
        .attr('fill', '#F27D26')
        .attr('filter', 'drop-shadow(0 0 4px rgba(242, 125, 38, 0.8))');

      g.append('text')
        .attr('y', -10)
        .attr('text-anchor', 'middle')
        .attr('fill', '#fff')
        .attr('font-size', '10px')
        .attr('font-family', 'monospace')
        .text(planet);
    }

  }, [planetPositions]);

  return (
    <div className="flex justify-center items-center p-4 bg-black/20 rounded-full backdrop-blur-sm border border-white/5">
      <svg ref={svgRef}></svg>
    </div>
  );
};

export default BirthChart;

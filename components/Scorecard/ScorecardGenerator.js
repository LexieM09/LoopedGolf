import React, { useEffect } from "react";

export default function ScorecardGenerator({ scores, textColor = "black", courseName = "", onGenerate }) {
  useEffect(() => {
    if (scores && scores.some(s => s > 0)) {
      generateScorecardSVG();
    }
  }, [scores, textColor, courseName]);

  const generateScorecardSVG = () => {
    // Set text color based on prop
    const textColorValue = textColor === "white" ? "#FFFFFF" : "#000000";

    // Calculate totals
    const frontNine = scores.slice(0, 9).reduce((sum, s) => sum + (s || 0), 0);
    const backNine = scores.slice(9, 18).reduce((sum, s) => sum + (s || 0), 0);
    const total = frontNine + backNine;

    // Use viewBox for scalable SVG
    const viewBoxWidth = 800;
    const viewBoxHeight = 380;
    const cellWidth = (viewBoxWidth - 120) / 10;
    const outX = 40 + (9 * cellWidth);

    // Generate SVG string with viewBox for scaling - INCREASED FONT WEIGHTS
    const svgString = `
      <svg viewBox="0 0 ${viewBoxWidth} ${viewBoxHeight}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
        <!-- Course Name -->
        ${courseName ? `<text x="40" y="30" font-family="Arial" font-size="24" font-weight="900" fill="${textColorValue}">${courseName}</text>` : ''}
        
        <!-- Front 9 Header -->
        <text x="40" y="${courseName ? '70' : '40'}" font-family="Arial" font-size="20" font-weight="900" fill="${textColorValue}">FRONT 9</text>
        
        <!-- Front 9 Holes -->
        ${[...Array(9)].map((_, i) => {
          const x = 40 + (i * cellWidth) + cellWidth / 2;
          const yBase = courseName ? 30 : 0;
          return `
            <text x="${x}" y="${75 + yBase}" font-family="Arial" font-size="16" font-weight="800" fill="${textColorValue}" text-anchor="middle">${i + 1}</text>
            <text x="${x}" y="${110 + yBase}" font-family="Arial" font-size="24" font-weight="900" fill="${textColorValue}" text-anchor="middle">${scores[i] || "-"}</text>
          `;
        }).join('')}
        
        <!-- Front 9 Total -->
        <text x="${outX + cellWidth / 2}" y="${courseName ? '105' : '75'}" font-family="Arial" font-size="16" font-weight="800" fill="${textColorValue}" text-anchor="middle">OUT</text>
        <text x="${outX + cellWidth / 2}" y="${courseName ? '140' : '110'}" font-family="Arial" font-size="24" font-weight="900" fill="${textColorValue}" text-anchor="middle">${frontNine || "0"}</text>
        
        <!-- Back 9 Header -->
        <text x="40" y="${courseName ? '200' : '170'}" font-family="Arial" font-size="20" font-weight="900" fill="${textColorValue}">BACK 9</text>
        
        <!-- Back 9 Holes -->
        ${[...Array(9)].map((_, i) => {
          const x = 40 + (i * cellWidth) + cellWidth / 2;
          const yBase = courseName ? 30 : 0;
          return `
            <text x="${x}" y="${205 + yBase}" font-family="Arial" font-size="16" font-weight="800" fill="${textColorValue}" text-anchor="middle">${i + 10}</text>
            <text x="${x}" y="${240 + yBase}" font-family="Arial" font-size="24" font-weight="900" fill="${textColorValue}" text-anchor="middle">${scores[i + 9] || "-"}</text>
          `;
        }).join('')}
        
        <!-- Back 9 Total -->
        <text x="${outX + cellWidth / 2}" y="${courseName ? '235' : '205'}" font-family="Arial" font-size="16" font-weight="800" fill="${textColorValue}" text-anchor="middle">IN</text>
        <text x="${outX + cellWidth / 2}" y="${courseName ? '270' : '240'}" font-family="Arial" font-size="24" font-weight="900" fill="${textColorValue}" text-anchor="middle">${backNine || "0"}</text>
        
        <!-- Total Score -->
        <text x="${viewBoxWidth - 190}" y="${courseName ? '328' : '298'}" font-family="Arial" font-size="18" font-weight="900" fill="${textColorValue}">TOTAL:</text>
        <text x="${viewBoxWidth - 35}" y="${courseName ? '330' : '300'}" font-family="Arial" font-size="32" font-weight="900" fill="${textColorValue}" text-anchor="end">${total || "0"}</text>
      </svg>
    `;

    // Store as data URL
    const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
    
    if (onGenerate) {
      // Pass both SVG string and data URL
      onGenerate(svgDataUrl, svgString);
    }
  };

  return null;
}
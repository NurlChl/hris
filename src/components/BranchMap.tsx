"use client";

import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface BranchMapProps {
  lat: number;
  lng: number;
  radius: number;
  onChange: (lat: number, lng: number) => void;
}

export default function BranchMap({ lat, lng, radius, onChange }: BranchMapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);

  useEffect(() => {
    // Fix leaflet marker icon URLs
    // Leaflet derives icon URLs from a private field that breaks under a
    // bundler; removing it forces the explicit CDN URLs set below to be used.
    delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
      iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
      shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    });

    if (mapRef.current && !leafletMap.current) {
      // Initialize map
      leafletMap.current = L.map(mapRef.current).setView([lat, lng], 16);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(leafletMap.current);

      // Create marker
      markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(leafletMap.current);

      // Create radius circle
      circleRef.current = L.circle([lat, lng], {
        radius: radius,
        color: "#3b82f6",
        fillColor: "#3b82f6",
        fillOpacity: 0.15,
      }).addTo(leafletMap.current);

      // Handle marker drag end
      markerRef.current.on("dragend", () => {
        const position = markerRef.current!.getLatLng();
        onChange(position.lat, position.lng);
        circleRef.current!.setLatLng(position);
      });

      // Handle map click
      leafletMap.current.on("click", (e) => {
        const position = e.latlng;
        markerRef.current!.setLatLng(position);
        circleRef.current!.setLatLng(position);
        onChange(position.lat, position.lng);
      });
    }

    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, []);

  // Update map marker and circle position when lat/lng changes from external source
  useEffect(() => {
    if (leafletMap.current && markerRef.current && circleRef.current) {
      const position = L.latLng(lat, lng);
      markerRef.current.setLatLng(position);
      circleRef.current.setLatLng(position);
      leafletMap.current.setView(position);
    }
  }, [lat, lng]);

  // Update circle radius when radius value changes
  useEffect(() => {
    if (circleRef.current) {
      circleRef.current.setRadius(radius);
    }
  }, [radius]);

  return (
    <div className="space-y-1">
      <label className="text-xs text-subtle font-semibold">Titik Lokasi & Radius Absen</label>
      <div 
        ref={mapRef} 
        className="w-full h-64 rounded-lg border border-white/8 relative z-10"
        style={{ minHeight: "250px" }}
      />
      <p className="text-xs text-muted italic mt-1">
        * Geser penanda pin merah atau klik pada peta untuk menentukan koordinat presisi.
      </p>
    </div>
  );
}

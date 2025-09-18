"use client";
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

import { useJsApiLoader, GoogleMap, Marker, InfoWindow } from '@react-google-maps/api';

const center = { lat: 20.37849895555017, lng: 72.89998162083053 }
//Enlightened Digital Marketing Position

const HomePage = () => {

  const [infowindow, setInfowindow] = useState(false);
  const [markerData, setMarkerData] = useState<any>(null);
  
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY as string,
  });


  const connectToSocketServer = function () {
    const socket = io(process.env.NEXT_PUBLIC_BACKEND_URL as string, {
      withCredentials: true,
    });

    socket.on("welcome-message", function (data) {
      alert(data.message);
    })

    socket.on("trackerdata", function ({ trackerdata }) {

      setMarkerData(trackerdata);
    })
  }

  const getLastTrackderData = async function(){
     const data =  await (await fetch(process.env.NEXT_PUBLIC_BACKEND_URL as string + "/last-trackderdata" )).json();
     setMarkerData(data.trackerdata);
  }

  useEffect(() => {
    getLastTrackderData();
    connectToSocketServer();
  }, []);


  return (
    !isLoaded ? (
      <h1>Loading...</h1>
    ) : (
      <GoogleMap mapContainerStyle={{
        width: "100%",
        height: "90vh",
      }} center={center} zoom={10}>
        {/* Marker */}
        {markerData && <Marker position={{ lat: markerData.latitude, lng: markerData.longitude }} onClick={() => setInfowindow(!infowindow)} />}

        {/* Info Window */}
        {markerData && infowindow && <InfoWindow position={{ lat: markerData.latitude, lng: markerData.longitude }} options={{ pixelOffset: new window.google.maps.Size(0, -28) }} onCloseClick={() => setInfowindow(false)}>
          <div style={{ fontSize: "13px" }}>
            <b>Truck ID:</b> {markerData?.truckId} <br />

            <b>Lock State:</b> {markerData?.lockState} <br />
            <b>Battery:{markerData?.battery}   ({markerData?.voltage}) </b> <br />
            <b>GPS Time:</b> {markerData?.gpsTime} <br />
            <b>Temperature:</b>{markerData?.temperature} <br />
            <b>Run Status:</b> {markerData?.runStatus} <br />
            <b>LAT,LONG:</b> {markerData?.latitude}, {markerData?.longitude} <br />
            <b>Status:</b> {markerData?.status} <br />
            <b>Location:</b> {markerData?.location}
          </div>
        </InfoWindow>}

      </GoogleMap>
    )
  )
}

export default HomePage

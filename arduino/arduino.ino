#include <ESP8266WiFi.h>
#include <WiFiClient.h>
#include <ESP8266WebServer.h>
#include <ESP8266mDNS.h>
#include <WiFiUDP.h>
#include <SoftwareSerial.h>
#include <ArduinoJson.h>
#include "config.h"

char packetBuffer[255];
WiFiUDP UDP;
IPAddress myIP;
SoftwareSerial Roomba(rx, tx);

void setup() {
  Roomba.begin(19200);
  pinMode(dd, OUTPUT);
  pinMode(a1, OUTPUT);
  pinMode(a2, OUTPUT);

  Serial.begin (9600);
  delay(10);
  connectWifi();
  delay(1000);
  Serial.println();
  Serial.println("Roomba Start");
  wakeUp();
  startSafe();
}

void loop() {
  int packetSize = UDP.parsePacket();
  if (packetSize) {
    int len = UDP.read(packetBuffer, packetSize);
    if (len > 0) packetBuffer[len] = '\0';

    String json = packetBuffer;
    StaticJsonBuffer<200> jsonBuffer;
    JsonObject& root = jsonBuffer.parseObject(json);

    int left = root["left"];
    int right = root["right"];
    drivePWM(left, right);

    int ms = root["ms"];
    if (ms > 0) {
      delay(ms);
      drivePWM(0, 0);
    }


    if (root["a1"] > 0) {
      digitalWrite(a1, HIGH);
    } else {
      digitalWrite(a1, LOW);
    }
    if (root["a2"] > 0) {
      digitalWrite(a2, HIGH);
    } else {
      digitalWrite(a2, LOW);
    }

    if (root["reset"] > 0) {
      wakeUp();
      startSafe();
    }
    if (root["sleep"] > 0) {
      sleep();
    }
    if (root["dock"] > 0) {
      seekDock();
    }
  }
}

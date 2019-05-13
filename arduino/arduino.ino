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
  Roomba.begin(115200);
  pinMode(dd, OUTPUT);
  pinMode(a1, OUTPUT);
  pinMode(a2, OUTPUT);

  Serial.begin (9600);
  delay(10);

  // Connect WiFi
  Serial.println();
  Serial.print("Connecting to ");
  Serial.println(ssid);
  WiFi.hostname("Name");
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("");
  Serial.println("WiFi connected");

  // Print the IP address
  Serial.print("IP address: ");
  Serial.print(WiFi.localIP());
  Serial.println();
  Serial.println();

  if (MDNS.begin("esp8266")) {
    Serial.println ("MDNS responder started");
  }

  myIP = WiFi.localIP();
  Serial.print("AP IP address: ");
  Serial.println(myIP);
  UDP.begin(localPort);

  delay(1000);
  Serial.println();
  Serial.println("Roomba Start");
  wakeUp();
  startSafe();
}

void wakeUp () {
  Serial.println("Wake Up");
  digitalWrite(dd, HIGH);
  delay(100);
  digitalWrite(dd, LOW);
  delay(500);
  digitalWrite(dd, HIGH);
  delay(2000);
}

void startSafe() {
  Serial.println("Start Safe");
  Roomba.write(OP_START);
  delay(50);
  Roomba.write(OP_SAFE_MODE);
  delay(50);
}

void sleep() {
  Serial.println("Sleep");  
  Roomba.write(OP_POWER_OFF);
}

void seekDock() {
  Serial.println("Seek Dock");  
  Roomba.write(OP_SEEK_DOCK);
}

void drive(int velocity, int radius) {  
  Roomba.write(137);
  Roomba.write(velocity >> 8);
  Roomba.write(velocity);
  Roomba.write(radius >> 8);
  Roomba.write(radius);
}

void driveWheels(int left, int right) {
  Roomba.write(145);
  Roomba.write(right >> 8);
  Roomba.write(right);
  Roomba.write(left >> 8);
  Roomba.write(left);
}

void drivePWM(signed short leftPWM, signed short rightPWM) {
  Roomba.write(OP_DRIVE_PWM);
  Roomba.write(rightPWM >> 8);
  Roomba.write(rightPWM);
  Roomba.write(leftPWM >> 8);
  Roomba.write(leftPWM);
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

//    drive(left, 0);
//    driveWheels(left, right);
    drivePWM(left, right);

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

    /*
    UDP.beginPacket("0.0.0.0", 8884);
    UDP.write("ok");
    UDP.endPacket();
    */
  }
}

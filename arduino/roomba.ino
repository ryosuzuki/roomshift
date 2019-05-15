void wakeUp() {
  Serial.println("Wake Up");
  digitalWrite(dd, HIGH);
  delay(100);
  digitalWrite(dd, LOW);
  delay(100);
  digitalWrite(dd, HIGH);
  delay(2000);

  // Change baud rate to 19200 with three pulse
  digitalWrite(dd, LOW);
  delay(100);
  digitalWrite(dd, HIGH);
  delay(100);
  digitalWrite(dd, LOW);
  delay(100);
  digitalWrite(dd, HIGH);
  delay(100);
  digitalWrite(dd, LOW);
  delay(100);
  digitalWrite(dd, HIGH);
  delay(100);
  digitalWrite(dd, LOW);
}

void startSafe() {
  Serial.println("Start Safe");
  Roomba.write(OP_START);
  delay(50);
  Roomba.write(OP_SAFE_MODE);
  delay(50);
  playSound(1);
  displayMyIp();
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
  Roomba.write(OP_DRIVE);
  Roomba.write(velocity >> 8);
  Roomba.write(velocity);
  Roomba.write(radius >> 8);
  Roomba.write(radius);
}

void driveWheels(int left, int right) {
  Roomba.write(OP_DRIVE_WH);
  Roomba.write(right >> 8);
  Roomba.write(right);
  Roomba.write(left >> 8);
  Roomba.write(left);
}

void drivePWM(int leftPWM, int rightPWM) {
  Roomba.write(OP_DRIVE_PWM);
  Roomba.write(rightPWM >> 8);
  Roomba.write(rightPWM);
  Roomba.write(leftPWM >> 8);
  Roomba.write(leftPWM);
}

void playSound(int num) {
  switch(num) { 
    case 1: 
      Roomba.write("\x8c\x01\x04\x42\x20\x3e\x20\x42\x20\x3e\x20"); // [140] [1] [4] [68] [32] ... place "start sound" in slot 1
      Roomba.write("\x8d\x01"); // [141] [1] play it (in slot 1)
      break;
    case 2: 
      Roomba.write("\x8c\x01\x01\x3c\x20"); // place "low freq sound" in slot 2
      Roomba.write("\x8d\x01"); // play it (in slot 2)
      break;
    case 3:
      Roomba.write("\x8c\x01\x01\x48\x20"); // place "high freq sound" in slot 3
      Roomba.write("\x8d\x01"); // play it (in slot 3)
      break;
  }
}

void displayMyIp() {
  int lastDigits = myIP[3];
  int d1 = getNthDigit(lastDigits, 4);
  int d2 = getNthDigit(lastDigits, 3);
  int d3 = getNthDigit(lastDigits, 2);
  int d4 = getNthDigit(lastDigits, 1);
  setDigitLEDs(d1, d2, d3, d4);
}

int getNthDigit(int a, int n) {
  unsigned long Pow = 1;
  for(byte d = 0; d < (n-1); d++)
    Pow *= 10;
  return (a / Pow) % 10;
}

void setDigitLEDs(byte digit1, byte digit2, byte digit3, byte digit4) {
    Roomba.write(163);
    Roomba.write(digit1);
    Roomba.write(digit2);
    Roomba.write(digit3);
    Roomba.write(digit4);
}

void setDigitLEDFromASCII(byte digit, char letter) {
  char digit1;
  char digit2;
  char digit3;
  char digit4;  
  switch (digit){
  case 1:
    digit1 = letter;
    break;
  case 2:
    digit2 = letter;
    break;
  case 3:
    digit3 = letter;
    break;
  case 4:
    digit4 = letter;
    break;
  }
  Roomba.write(164);
  Roomba.write(digit1);
  Roomba.write(digit2);
  Roomba.write(digit3);
  Roomba.write(digit4);
}

void cleanDigitLED(void) {
  setDigitLEDFromASCII(1, ' ');
  setDigitLEDFromASCII(2, ' ');
  setDigitLEDFromASCII(3, ' ');
  setDigitLEDFromASCII(4, ' ');
}

void writeLEDs(char a, char b, char c, char d) {
  setDigitLEDFromASCII(1, a);
  setDigitLEDFromASCII(2, b);
  setDigitLEDFromASCII(3, c);
  setDigitLEDFromASCII(4, d);
}

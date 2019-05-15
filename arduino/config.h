#ifndef CONFIG_H
#define CONFIG_H

static const char *ssid = "Ryo Suzuki";
static const char *password = "ryotomomi";
//static const char *ssid = "The Grid";
//static const char *password = "BeamMeIn";

int localPort = 8883;

int rx = 5; // D1 -> Roomba TX 4 (Left Middle) 
int tx = 4; // D2 -> Roomba RX 3 (Right Middle)
int dd = 0; // D3 -> Roomba BRC 5 (Right Top)

int a1 = 14; // D5 -> A1 + B1
int a2 = 12; // D6 -> A2 + B2

//int a1 = 13; // D7 -> A1
//int a2 = 15; // D8 -> A2
//int b1 = 14; // D5 -> B1
//int b2 = 12; // D6 -> B2

#define OP_START     128
#define OP_SAFE_MODE 131
#define OP_POWER_OFF 133
#define OP_DRIVE_PWM 146
#define OP_DIGIT_LED 164
#define OP_LED       139
#define OP_SEEK_DOCK 143
#define OP_DRIVE     137
#define OP_DRIVE_WH  145

#endif

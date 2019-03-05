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

#define OP_START     128
#define OP_SAFE_MODE 131
#define OP_POWER     133
#define OP_DRIVE_PWM 146
#define OP_DIGIT_LED 164

#endif
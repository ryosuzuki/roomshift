using UnityEngine;
using System.Net.Sockets;
using System.Text;

public class UDPClient : MonoBehaviour {
    public string host = "192.168.1.158";
    public int port = 8883;
    private UdpClient client;

    private class Command {
        public int left;
        public int right;
    }

    // Use this for initialization
    void Start () {
        client = new UdpClient();
        client.Connect(host, port);
	  }

  	// Update is called once per frame
  	void Update () {
  	}

    void OnGUI() {
      if (GUI.Button(new Rect(10, 10, 100, 40), "Left")) {
        SendCommand(255, -255);
      }
      if (GUI.Button(new Rect(10, 60, 100, 40), "Right")) {
        SendCommand(-255, 255);
      }
      if (GUI.Button(new Rect(10, 110, 100, 40), "Forward")) {
        SendCommand(255, 255);
      }
      if (GUI.Button(new Rect(10, 160, 100, 40), "Backward")) {
        SendCommand(-255, -255);
      }
      if (GUI.Button(new Rect(10, 210, 100, 40), "Stop")) {
        SendCommand(0, 0);
      }
    }

    void SendCommand(int left, int right) {
      Command command = new Command();
      command.left = left;
      command.right = right;
      string json = JsonUtility.ToJson(command);
      byte[] dgram = Encoding.UTF8.GetBytes(json);
      client.Send(dgram, dgram.Length);
    }

    void OnApplicationQuit() {
      client.Close();
    }
}

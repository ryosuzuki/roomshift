using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using System.Net.Sockets;
using System.Text;

public class Robot : MonoBehaviour {
    public string host = "192.168.1.158";
    public int port = 8883;
    private UdpClient client;
    private Vector3 target;

    float dx;
    float dz;
    float diff;
    float dist;

    private class Command
    {
        public int left;
        public int right;
    }

    void Start()
    {
        client = new UdpClient();
        client.Connect(host, port);
    }

    void Update()
    {
    
        if (dist > 0.1f)
        {
            Calculate();
            int left = 100;
            int right = 100;
            float param = 5;
            int unit = Mathf.RoundToInt((90 - Mathf.Abs(diff)) / 90);
            if (diff < 0)
            {
                right = unit;
            } else
            {
                left = unit;
            }

            int value = 50;
            int d = left - right;
            if (diff < -30f)
            {
                // Right
                // transform.Rotate(0, 0.5f, 0, Space.Self);
                SendCommand(-value, value);
            } else if (diff > 30f)
            {
                // Left
                // transform.Rotate(0, -0.5f, 0, Space.Self);
                SendCommand(value, -value);
            }
            else {
                SendCommand(100, 100);
                /*
                Vector3 vector = transform.forward;
                Vector3 pos = transform.position;
                pos.x += vector.x * 0.01f;
                pos.z += vector.z * 0.01f;
                transform.position = pos;
                */
            }
        } else
        {
            SendCommand(0, 0);
        }

    }

    void Calculate()
    {
        Vector3 pos = transform.position;
        dx = target.x - pos.x;
        dz = target.z - pos.z;
        float dir = Mathf.Atan2(dx, dz) * Mathf.Rad2Deg;
        float angle = transform.eulerAngles.y;
        //diff = Mathf.Min(180 - Mathf.Abs(angle - dir), Mathf.Abs(angle - dir));
        diff = (angle - dir) % 360;
        Debug.Log(diff);
        dist = Mathf.Sqrt(dx * dx + dz * dz);
    
    }


    public void SetTarget(Vector3 _target)
    {
        target = _target;
        Calculate();
    }

    void SendCommand(int left, int right)
    {
        Command command = new Command();
        command.left = left;
        command.right = right;
        string json = JsonUtility.ToJson(command);
        byte[] dgram = Encoding.UTF8.GetBytes(json);
        client.Send(dgram, dgram.Length);
    }

    void OnApplicationQuit()
    {
        SendCommand(0, 0);
        client.Close();
    }
}

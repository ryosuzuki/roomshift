using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class Plane : MonoBehaviour {
    public GameObject targetObject;
    public GameObject robotObject;
    private Vector3 position;
    private Vector3 screenToWorldPointPosition;

	void Start () {
	}
	
	void Update () {
        if (Input.GetMouseButtonDown(0))
        {
            Ray ray = Camera.main.ScreenPointToRay(Input.mousePosition);
            RaycastHit hit;
            if (Physics.Raycast(ray, out hit, 100))
            {
                targetObject.transform.position = hit.point;
                Robot robot = robotObject.GetComponent<Robot>();
                robot.SetTarget(targetObject.transform.position);
            }
        }
	}
    
}

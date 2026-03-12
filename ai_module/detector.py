# ai_module/detector.py

"""
TrafficDetector

Purpose
-------
Analyze a single camera image and extract traffic metrics.

The detector DOES NOT make traffic decisions. 
It only converts an image into measurable traffic statistics.

Metrics produced
----------------
vehicle_count
vehicle_breakdown
weighted_vehicle_score
density_ratio

Features
--------
- YOLO vehicle detection
- Optional cropping of road region
- Hybrid density estimation using Canny edges
"""

import cv2
import numpy as np
from ultralytics import YOLO
from collections import defaultdict


class TrafficDetector :

    def __init__(self, model_path : str, crop_enabled : bool = False, crop_region : dict = None) :
        """
        Initialize the detector.

        Parameters
        ----------
        model_path : path to YOLO model
        crop_enabled : enable / disable cropping
        crop_region : dictionary defining crop ratios
        """

        self.model = YOLO(model_path)

        # Vehicle classes considered in traffic analysis
        self.vehicle_classes = [ "bicycle", "motorcycle", "car", "bus", "truck"]

        # Vehicle weights for congestion impact
        self.vehicle_weights = { "bicycle" : 1, "motorcycle" : 1, "car" : 2, "bus" : 4, "truck" : 5 }

        # Cropping configuration
        self.crop_enabled = crop_enabled

        if crop_region is None :
            self.crop_region = {
                "top" : 0.0,
                "bottom" : 1.0,
                "left" : 0.0,
                "right" : 1.0
            }
        else :
            self.crop_region = crop_region


    def _crop_image(self, image : np.ndarray) :
        """
        Crop the image according to configured ratios.
        """

        h, w = image.shape[ : 2]

        top     = int(h * self.crop_region["top"])
        bottom  = int(h * self.crop_region["bottom"])
        left    = int(w * self.crop_region["left"])
        right   = int(w * self.crop_region["right"])

        return image[top : bottom, left : right]


    def _compute_edge_density(self, image : np.ndarray) :
        """
        Compute density using Canny edge detection.
        """

        gray    = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        edges   = cv2.Canny(blurred, 50, 150)
        
        kernel = np.ones((5, 5), np.uint8)
        closed_edges = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, kernel)
        h, w = closed_edges.shape

        # divide image into 3 zones vertically
        zone_height = h // 3

        zone_near = closed_edges[2 * zone_height : h, : ]
        zone_mid  = closed_edges[zone_height : 2 * zone_height, : ]
        zone_far  = closed_edges[0 : zone_height, : ]

        def density(zone) :
            return np.count_nonzero(zone) / zone.size

        density_near = density(zone_near)
        density_mid = density(zone_mid)
        density_far = density(zone_far)

        # weighted combination
        density_ratio = (
            0.5 * density_near +
            0.3 * density_mid +
            0.2 * density_far
        )

        return density_ratio


    def analyze_image(self, image : np.ndarray) :
        """
        Analyze one camera image.

        Returns
        -------
        dict containing traffic metrics.
        """

        if self.crop_enabled :
            image = self._crop_image(image)

        results = self.model(image)
        counts = defaultdict(int)
        boxes = results[0].boxes

        if boxes is not None :
            for cls in boxes.cls :
                label = self.model.names[int(cls)]
                if label in self.vehicle_classes :
                    counts[label] += 1

        vehicle_count = sum(counts.values())
        weighted_score = 0

        for vehicle_type, count in counts.items() :
            weighted_score += count * self.vehicle_weights[vehicle_type]

        density_ratio = self._compute_edge_density(image)

        return {
            "vehicle_count"             : vehicle_count,
            "vehicle_breakdown"         : dict(counts),
            "weighted_vehicle_score"    : weighted_score,
            "density_ratio"             : density_ratio
        }
        

    def analyze_image_with_visualization(self, image) :
        """
        Analyze image and also return YOLO annotated visualization.
        """

        original = image.copy()

        if self.crop_enabled :
            image = self._crop_image(image)

        results = self.model(image)
        annotated = results[0].plot()
        metrics = self.analyze_image(original)

        return metrics, annotated
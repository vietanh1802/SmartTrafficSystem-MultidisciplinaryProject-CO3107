# test_system.py

import cv2
import matplotlib.pyplot as plt

from ai_module.detector import TrafficDetector
from backend.models.traffic_state import DirectionState
from backend.models.traffic_state import TrafficState
from backend.services.decision_maker import DecisionMaker


def visualize(images, annotated_images, titles) :

    num_images = len(images)

    plt.figure(figsize = (16, 8))

    for i in range(num_images) :

        plt.subplot(2, num_images, i + 1)
        plt.imshow(images[i])
        plt.title("Raw")
        plt.axis("off")

        plt.subplot(2, num_images, num_images + i + 1)
        plt.imshow(annotated_images[i])
        plt.title(titles[i])
        plt.axis("off")

    plt.suptitle("Traffic Detection Results", fontsize = 16)

    plt.show()


def main() :

    detector = TrafficDetector(
        model_path = "yolov8m.pt",
        crop_enabled = False
    )

    decision_maker = DecisionMaker()

    paths = [
        "data/raw/north.jpg",
        "data/raw/south.jpg",
        "data/raw/east.jpg",
        "data/raw/west.jpg"
    ]

    names = ["North", "South", "East", "West"]

    raw_images = []
    annotated_images = []
    metrics_list = []

    print("\n========== DETECTION ==========\n")

    for path in paths :

        img = cv2.imread(path)

        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

        metrics, annotated = detector.analyze_image_with_visualization(img)

        raw_images.append(img_rgb)
        annotated_images.append(cv2.cvtColor(annotated, cv2.COLOR_BGR2RGB))
        metrics_list.append(metrics)

    titles = []

    for name, metrics in zip(names, metrics_list) :

        text = (
            f"{name}\n"
            f"Vehicles : {metrics['vehicle_count']}\n"
            f"Weighted : {metrics['weighted_vehicle_score']}\n"
            f"Density : {metrics['density_ratio']:.3f}"
        )

        titles.append(text)

        print(name, ":", metrics)

    visualize(raw_images, annotated_images, titles)

    north_state = DirectionState(**metrics_list[0])
    south_state = DirectionState(**metrics_list[1])
    east_state  = DirectionState(**metrics_list[2])
    west_state  = DirectionState(**metrics_list[3])

    temperature = 34
    light = 850

    traffic_state = TrafficState(
        north_state,
        south_state,
        east_state,
        west_state,
        temperature,
        light
    )

    print("\n========== DECISION CYCLES ==========\n")

    for cycle in range(10) :

        print(f"\n----- Cycle {cycle + 1} -----")

        decision = decision_maker.decide(
            traffic_state,
            current_phase = "NS"
        )

        print("Decision :", decision)


if __name__ == "__main__" :
    main()
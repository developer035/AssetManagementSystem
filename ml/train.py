"""
Local training script (mirrors the Colab notebook).
Use this if you have a local GPU, otherwise use the Colab notebook.
"""
from ultralytics import YOLO


def train():
    model = YOLO("yolo11m-seg.pt")

    model.train(
        data="data.yaml",
        epochs=100,
        imgsz=640,
        batch=16,
        device="0",
        patience=20,
        save_period=10,
        optimizer="AdamW",
        lr0=0.001,
        lrf=0.01,
        weight_decay=0.0005,
        warmup_epochs=5,
        augment=True,
        degrees=180.0,
        flipud=0.5,
        fliplr=0.5,
        mosaic=1.0,
        mixup=0.15,
        copy_paste=0.3,
        hsv_h=0.015,
        hsv_s=0.7,
        hsv_v=0.4,
        scale=0.5,
        translate=0.1,
        project="runs/train",
        name="landcover_v1",
        exist_ok=True,
    )


if __name__ == "__main__":
    train()

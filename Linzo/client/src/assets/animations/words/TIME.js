export const TIME = (ref) => {
    let animations = []
    
    // TIME sign - tap wrist with index finger
    animations.push(["mixamorigRightHandIndex1", "rotation", "x", Math.PI/2, "+"]);
    animations.push(["mixamorigRightHandIndex2", "rotation", "x", Math.PI/2, "+"]);
    animations.push(["mixamorigRightHandIndex3", "rotation", "x", Math.PI/2, "+"]);
    animations.push(["mixamorigRightHand", "rotation", "x", Math.PI/6, "+"]);
    animations.push(["mixamorigRightForeArm", "rotation", "x", -Math.PI/6, "-"]);
    
    ref.animations.push(animations);
    
    animations = []
    
    // Return to default pose
    animations.push(["mixamorigRightHandIndex1", "rotation", "x", 0, "-"]);
    animations.push(["mixamorigRightHandIndex2", "rotation", "x", 0, "-"]);
    animations.push(["mixamorigRightHandIndex3", "rotation", "x", 0, "-"]);
    animations.push(["mixamorigRightHand", "rotation", "x", 0, "-"]);
    animations.push(["mixamorigRightForeArm", "rotation", "x", 0, "+"]);
    
    ref.animations.push(animations);
    
    if(ref.pending === false){
        ref.pending = true;
        ref.animate();
    }
}

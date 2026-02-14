export const C = (ref) => {
    let animations = []
    
    // C sign - curved hand like letter C
    animations.push(["mixamorigRightHand", "rotation", "x", Math.PI/3, "+"]);
    animations.push(["mixamorigRightHand", "rotation", "z", Math.PI/6, "+"]);
    animations.push(["mixamorigRightForeArm", "rotation", "x", -Math.PI/8, "-"]);
    
    ref.animations.push(animations);
    
    animations = []
    
    // Return to default pose
    animations.push(["mixamorigRightHand", "rotation", "x", 0, "-"]);
    animations.push(["mixamorigRightHand", "rotation", "z", 0, "-"]);
    animations.push(["mixamorigRightForeArm", "rotation", "x", 0, "+"]);
    
    ref.animations.push(animations);
    
    if(ref.pending === false){
        ref.pending = true;
        ref.animate();
    }
}
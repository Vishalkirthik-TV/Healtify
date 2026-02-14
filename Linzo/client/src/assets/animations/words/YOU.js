export const YOU = (ref) => {
    let animations = []
    
    // YOU sign - index finger pointing forward
    animations.push(["mixamorigRightHandIndex1", "rotation", "x", Math.PI/2, "+"]);
    animations.push(["mixamorigRightHandIndex2", "rotation", "x", Math.PI/2, "+"]);
    animations.push(["mixamorigRightHandIndex3", "rotation", "x", Math.PI/2, "+"]);
    animations.push(["mixamorigRightHand", "rotation", "x", Math.PI/4, "+"]);
    animations.push(["mixamorigRightForeArm", "rotation", "x", -Math.PI/8, "-"]);
    
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

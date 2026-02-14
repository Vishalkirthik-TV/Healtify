export const B = (ref) => {
    let animations = []
    
    // Basic B sign - flat hand with fingers together
    animations.push(["mixamorigLeftHand", "rotation", "x", Math.PI/2, "+"]);
    animations.push(["mixamorigLeftHand", "rotation", "z", 0, "+"]);
    animations.push(["mixamorigLeftForeArm", "rotation", "x", Math.PI/6, "+"]);
    
    ref.animations.push(animations);
    
    animations = []
    
    // Return to default pose
    animations.push(["mixamorigLeftHand", "rotation", "x", 0, "-"]);
    animations.push(["mixamorigLeftForeArm", "rotation", "x", 0, "-"]);
    
    ref.animations.push(animations);
    
    if(ref.pending === false){
        ref.pending = true;
        ref.animate();
    }
}
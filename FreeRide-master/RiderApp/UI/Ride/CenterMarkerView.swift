//
//  CenterMarkerView.swift
//  FreeRide
//

import UIKit

class CenterMarkerView: UIView {
    
    let imgView = UIImageView()

    override func awakeFromNib() {
        super.awakeFromNib()
        initialize()
    }
    
    init() {
        super.init(frame: .zero)
        initialize()
    }

    required init?(coder aDecoder: NSCoder) {
        super.init(coder: aDecoder)
        initialize()
    }

    private func initialize() {
        constrainSize(CGSize(width: 40, height: 80))
        translatesAutoresizingMaskIntoConstraints = false
    }
    
    func configure(_ isPickup: Bool) {
        imgView.frame = CGRect(x: 0, y: 0, width: 40, height: 40)
        imgView.image = UIImage(named: isPickup ? "pickupEdit.png" : "dropoffEdit.png")
        addSubview(imgView)
    }

}

//
//  LocationPricesView.swift
//  FreeRide
//

import Foundation
import UIKit

class LocationPricesView: UIView {

    @IBOutlet private weak var titleLabel: Label!
    
    @IBOutlet weak var ridePriceTitleLabel: Label!
    
    override func awakeFromNib() {
        super.awakeFromNib()
        
        titleLabel.style = .subtitle6bluegray
        titleLabel.text = "Location Prices".localize()
        ridePriceTitleLabel.style = .subtitle1darkgray
        ridePriceTitleLabel.numberOfLines = 0
    }

    func configure(with ridesFareCopy: String?) {
        
        guard let ridesFare = ridesFareCopy else {
            isHidden = true
            return
        }
        
        ridePriceTitleLabel.text = ridesFare
    }
}

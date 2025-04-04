//
//  AccessibilityFooterView.swift
//  RiderApp
//
//  Created by Andrew Boryk on 12/30/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import UIKit

class AccessibilityFooterView: UIView {
    
    
    @IBOutlet weak var infoLabel: Label!
    
    override func awakeFromNib() {
        super.awakeFromNib()
        infoLabel.style = .subtitle3blue
        infoLabel.textColor = Theme.Colors.blueGray
        infoLabel.numberOfLines = 0
        infoLabel.text = "wav_toggle_info".localize()
    }

    static let recommendedHeight: CGFloat = 358
    
}

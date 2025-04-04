//
//  OptionsTableViewCell.swift
//  FreeRide
//
//  Created by Rui Magalhães on 05/12/2019.
//  Copyright © 2019 Rocket & Mouse Inc. All rights reserved.
//

import UIKit

class OptionsTableViewCell: UITableViewCell {
    @IBOutlet weak var optionLabel: Label!
        
    func configure(with option: String) {
        optionLabel.text = option.localize()
    }
    
}

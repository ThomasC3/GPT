//
//  ServicesTableViewCell.swift
//  FreeRide
//

import UIKit

class ServicesTableViewCell: UITableViewCell {

    @IBOutlet weak var serviceIconStack: UIStackView!
    @IBOutlet private weak var cardBackgroundView: CardView!
    @IBOutlet private weak var nameLabel: Label!
    @IBOutlet private weak var descriptionLabel: Label!

    func configure(with service: ServiceResponse) {
        cardBackgroundView.backgroundColor = Theme.Colors.white
        nameLabel.style = .body5bluegray
        descriptionLabel.style = .subtitle1bluegray
        nameLabel.text = service.title
        descriptionLabel.text =  service.desc
        
        let icons = service.getImages()
        
        for (index, icon) in icons.enumerated() {
            let iconView = UIImageView(image: icon)
            
            if icons.count == 1 {
                iconView.contentMode = .center
            } else {
                if index == 0 {
                    iconView.contentMode = .right
                } else if index == icons.count - 1 {
                    iconView.contentMode = .left
                } else {
                    iconView.contentMode = .center
                }
            }
            
            iconView.tintColor = Theme.Colors.blueGray
            serviceIconStack.addArrangedSubview(iconView)
        }
    }

}

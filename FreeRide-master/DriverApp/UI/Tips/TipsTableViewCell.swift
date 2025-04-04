//
//  TipsTableViewCell.swift
//  FreeRide
//


import UIKit

class TipsTableViewCell: UITableViewCell {
    
    @IBOutlet private weak var periodLabel: Label!
    @IBOutlet private weak var valueLable: Label!
    
    func configure(with tipsResponse: GetTipsResponse) {
        periodLabel.style = .body3bluegray
        valueLable.style = .body2bluegray
        periodLabel.text = "\(tipsResponse.month) \(tipsResponse.year)"
        valueLable.text = "\(tipsResponse.net.toPrice(with: "usd"))"
    }
    
}

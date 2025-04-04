//
//  SearchingBottomView.swift
//  Circuit
//
//  Created by Andrew Boryk on 12/18/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import UIKit

protocol SearchingBottomViewDelegate: AnyObject {
    func cancelRequest()
}

class SearchingBottomView: BottomCardView {

    @IBOutlet var searchingTitleLabel: Label!
    @IBOutlet var searchingLabel: Label!
    @IBOutlet private weak var cancelButton: Button?

    weak var delegate: SearchingBottomViewDelegate?

    private var searchingTimer: Timer?
    private var currentLoadingColor = Theme.Colors.seaFoam
    
    private var firstStatusCounter: Int!
    private var secondStatusCounter: Int!
    
    override func willMove(toSuperview newSuperview: UIView?) {
        super.willMove(toSuperview: newSuperview)
        if newSuperview == nil {
            resetCounters()
            stopLoadingTimer()
        }
    }
    
    override func awakeFromNib() {
        super.awakeFromNib()

        constrainHeight(220)
        resetCounters()
        searchingTitleLabel.style = .subtitle6blue
        searchingLabel.style = .subtitle3blue
        searchingTitleLabel.textColor = currentLoadingColor
        searchingLabel.textColor = Theme.Colors.darkGray
        cancelButton?.style = .cancel
        cancelButton?.setTitle("ride_cancel_request".localize(), for: .normal)
    }
    
    func configureFirstSearchStatus() {
        firstStatusCounter += 1
        searchingTitleLabel?.text = "ride_searching".localize()
        searchingLabel?.text = firstStatusCounter > 2 ? getRandomBodyCopy(1) : "ride_scanning_for_driver".localize()
        startLoadingTimer()
    }
    
    func configureSecondSearchStatus() {
        secondStatusCounter += 1
        searchingTitleLabel?.text = "ride_still_looking".localize()
        searchingLabel?.text = secondStatusCounter > 2 ? getRandomBodyCopy(2) : "ride_circuits_busy".localize()
        startLoadingTimer()
    }
    
    func startLoadingTimer() {
        stopLoadingTimer()
        searchingTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true, block: { _ in
            UIView.transition(with: self.searchingTitleLabel, duration: 0.8, options: .transitionCrossDissolve, animations: {
                self.currentLoadingColor = self.currentLoadingColor == Theme.Colors.darkGray ? Theme.Colors.seaFoam : Theme.Colors.darkGray
                self.searchingTitleLabel.textColor = self.currentLoadingColor
            }, completion: nil)
        })
    }
    
    func getRandomBodyCopy(_ period: Int) -> String {
        let options = period == 1 ?
            searchingFirstPeriodBodyOptions :
            searchingSecondPeriodBodyOptions
        
        let newOption = options.randomElement()!
        
        return newOption == self.searchingLabel.text ?
            self.getRandomBodyCopy(period) :
            newOption
    }
        
    func stopLoadingTimer() {
        searchingTimer?.invalidate()
        searchingTimer = nil
    }
    
    func resetCounters() {
        firstStatusCounter = 0
        secondStatusCounter = 0
    }

    @IBAction private func cancelAction() {
        delegate?.cancelRequest()
    }
    
    deinit {
       stopLoadingTimer()
   }
}
